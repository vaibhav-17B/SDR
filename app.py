from fastapi import FastAPI, HTTPException, Request, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from typing import Optional
import os
import json
import secrets
import time
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from datetime import datetime
import uuid
import glob
import json
from datetime import datetime, timedelta
from base_models import UserData, EmailGenerationParams, EmailSendRequest, LeadSearchRequest
from redis_helper import RedisSessionManager
from user_manager import UserManager
from utils import build_auth_html_response,email_helper
from leads_logic import LeadFinder
from apscheduler.schedulers.background import BackgroundScheduler


app = FastAPI()
RedisManager=RedisSessionManager()
lead_finder=LeadFinder(test=True)
user_manager=UserManager(redis_client=RedisManager)
email_sender=email_helper()
scheduler = BackgroundScheduler(timezone="UTC")
scheduler.start()


ALLOWED_ORIGINS = [
    "https://preview--quick-mail-craft.lovable.app",
    "https://533053b84319.ngrok-free.app",  
    "http://localhost:8080",                          
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.middleware("http")
async def add_coop_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add Cross-Origin-Opener-Policy header to allow popup communication
    if request.url.path == "/auth/callback":
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
    
    return response

# Gmail API scopes
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile', 
    'openid'
]

CREDENTIALS_FILE = "C:/Users/VVISH/Downloads/client_secret_391284284233-4bmdqk1e5pat39r1emhi6vhv5cquamvk.apps.googleusercontent.com.json"
TOKENS_FOLDER = 'tokens'

os.makedirs(TOKENS_FOLDER, exist_ok=True)

# Add environment variable or configuration
REDIRECT_BASE_URL = os.getenv("REDIRECT_BASE_URL", "https://533053b84319.ngrok-free.app")
print(f"REDIRECT_BASE_URL: {REDIRECT_BASE_URL}\n")


@app.get("/")
async def root():
    return {"message": "Gmail Email Composer API"}

@app.post("/api/authenticate-gmail")
async def start_gmail_auth(request: Request):
    try:
        # Get auth state from request body
        body = await request.json()
        frontend_auth_state = body.get('auth_state')
        
        if not frontend_auth_state:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing auth_state parameter"}
            )
        
        if not os.path.exists(CREDENTIALS_FILE):
            return JSONResponse(
                status_code=500,
                content={"error": "Credentials file not found"}
            )

        redirect_uri = f"{REDIRECT_BASE_URL}/auth/callback"

        flow = Flow.from_client_secrets_file(
            CREDENTIALS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )

        # Use frontend auth state as OAuth state parameter
        # Also store it in Redis to track the auth flow
        if not RedisManager.store_oauth_state(frontend_auth_state, expiry_minutes=10):
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to store OAuth state"}
            )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=frontend_auth_state,  # Use frontend-provided state
            prompt='consent'
        )

        print("🔐 Redirect URI used for auth:", redirect_uri)   
        print("🔗 Frontend auth state:", frontend_auth_state)
        print("🔗 Full Authorization URL:", authorization_url)

        return {"authorization_url": authorization_url}
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to start authentication: {str(e)}"}
        )


@app.get("/auth/callback")
async def auth_callback(request: Request):
    """Handle OAuth callback and store authentication data in Redis"""
    try:
        code = request.query_params.get('code')
        state = request.query_params.get('state')
        error = request.query_params.get('error')

        if error:
            return build_auth_html_response(
                title="Authentication Error",
                heading="Authentication Error",
                message=f"Error: {error}",
                post_message_type="GMAIL_AUTH_ERROR",
                success=False,
                data={"error": error}
            )

        if not code or not state:
            return build_auth_html_response(
                title="Authentication Error",
                heading="Authentication Error",
                message="Missing authorization code or state parameter",
                post_message_type="GMAIL_AUTH_ERROR",
                success=False,
                data={"error": "Missing authorization parameters"}
            )

        if not RedisManager.verify_oauth_state(state):
            return build_auth_html_response(
                title="Authentication Error",
                heading="Authentication Error",
                message="Invalid or expired state parameter",
                post_message_type="GMAIL_AUTH_ERROR",
                success=False,
                data={"error": "Invalid or expired state parameter"}
            )

        # OAuth token exchange
        redirect_uri = f"{REDIRECT_BASE_URL}/auth/callback"
        flow = Flow.from_client_secrets_file(
            CREDENTIALS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        flow.fetch_token(code=code)
        creds = flow.credentials

        # Get user info from Google
        people_service = build('people', 'v1', credentials=creds)
        profile = people_service.people().get(
            resourceName='people/me',
            personFields='names,emailAddresses'
        ).execute()

        name = profile.get('names', [{}])[0].get('displayName', 'Unknown')
        email = profile.get('emailAddresses', [{}])[0].get('value', 'Unknown')

        # Enhanced session ID generation for better uniqueness
        session_id = f"{uuid.uuid4()}_{int(time.time())}_{secrets.token_urlsafe(8)}"
        auth_data = {
            'name': name,
            'email': email,
            'credentials': json.loads(creds.to_json())
        }

        # Store session data in Redis
        if not RedisManager.store_session_data(session_id, auth_data, expiry_hours=24):
            raise Exception("Failed to store session data")

        # IMPORTANT: Store auth completion data for polling using auth state
        auth_completion_data = {
            'session_id': session_id,
            'name': name,
            'email': email,
            'authenticated': True,
            'completed_at': datetime.now().isoformat()
        }
        
        auth_completion_key = f"auth_complete:{state}"
        if not RedisManager.store_session_data(auth_completion_key, auth_completion_data, expiry_hours=1):
            print(f"Warning: Failed to store auth completion data for state {state}")

        print(f"✅ Gmail authentication successful for: {name} ({email})")
        print(f"📝 Session ID created: {session_id}")
        print(f"🔗 Auth state completion stored: {state}")

        # Return simple success page - no postMessage needed!
        return HTMLResponse(f"""
        <!DOCTYPE html>
        <html>
            <head>
                <title>Authentication Successful</title>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                    .success {{ color: #28a745; }}
                    .message {{ margin: 20px 0; }}
                </style>
            </head>
            <body>
                <h2 class="success">✅ Authentication Successful!</h2>
                <p class="message">Your Gmail account has been connected successfully.</p>
                <p>You can close this window and return to the application.</p>
                <script>
                    // Auto-close after 3 seconds
                    setTimeout(() => {{
                        try {{
                            window.close();
                        }} catch (e) {{
                            console.log('Could not auto-close window');
                        }}
                    }}, 3000);
                </script>
            </body>
        </html>
        """, headers={
            "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
            "Cross-Origin-Embedder-Policy": "unsafe-none"
        })

    except Exception as e:
        return build_auth_html_response(
            title="Authentication Error",
            heading="Authentication Error",
            message=f"Error: {str(e)}",
            post_message_type="GMAIL_AUTH_ERROR",
            success=False,
            data={"error": str(e)}
        )

@app.get("/api/check-auth")
async def check_auth(request: Request):
    """Check authentication status using Redis for session management"""
    try:
        # Get session_id from headers if provided
        session_id = request.headers.get('X-Session-ID')
        
        print(f"DEBUG: session_id from headers: {session_id}")
        
        # First check for permanent token file (fully registered users)
        token_file = user_manager.get_user_token_file(session_id)
        print(f"\nDEBUG: token_file : {token_file}\n")
        print("Token folder path:", user_manager.tokens_folder)
        print("Available token files:", token_file)
        print("All Redis sessions:", RedisManager.get_all_session_keys())
        print("Redis session value:", RedisManager.get_session_data(session_id))

        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)

            if user_info and user_info.get('profile_complete'):
                try:
                    creds = Credentials.from_authorized_user_info(user_info['credentials'], SCOPES)

                    if creds and creds.valid:
                        return JSONResponse(content={
                            "authenticated": True,
                            "profile_complete": True,
                            "session_id": session_id,  # Include session_id in response
                            "user_info": {
                                "name": user_info['name'],
                                "email": user_info['email'],
                                "company_name": user_info['company_name'],
                                "designation": user_info['designation'],
                                "experience": user_info['experience']
                            }
                        })

                    elif creds and creds.expired and creds.refresh_token:
                        try:
                            creds.refresh(GoogleRequest())
                            with open(token_file, 'r') as f:
                                token_data = json.load(f)
                            token_data['credentials'] = json.loads(creds.to_json())
                            token_data['last_updated'] = datetime.now().isoformat()
                            with open(token_file, 'w') as f:
                                json.dump(token_data, f, indent=2)

                            return JSONResponse(content={
                                "authenticated": True,
                                "profile_complete": True,  
                                "session_id": session_id,  # Include session_id in response
                                "user_info": {
                                    "name": user_info['name'],
                                    "email": user_info['email'],
                                    "company_name": user_info['company_name'],
                                    "designation": user_info['designation'],
                                    "experience": user_info['experience']
                                }
                            })
                        except Exception as e:
                            print("Credential refresh failed:", e)
                            os.remove(token_file)

                except Exception as e:
                    print("Credential parsing failed:", e)
                    os.remove(token_file)

        # Check session-based authentication in Redis
        if session_id:
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                print(f"DEBUG: Found session data in Redis for {session_id}")
                return JSONResponse(content={
                    "authenticated": True,
                    "profile_complete": False,
                    "requires_profile": True,
                    "message": "Gmail authentication successful, profile completion required",
                    "session_id": session_id,
                    "user_info": {
                        "name": auth_data['name'],
                        "email": auth_data['email']
                    }
                })
            else:
                # Session ID provided but not found in Redis
                print(f"DEBUG: Session ID {session_id} not found in Redis")
                return JSONResponse(status_code=401, content={
                    "authenticated": False,
                    "profile_complete": False,
                    "session_invalid": True,
                    "clear_session": True,
                    "message": "Session not found or expired. Please login again."
                })

        
        # SECURITY: Never return other users' sessions
        # If no session_id provided, user must authenticate first

        print(f"No authentication found - token_file: {token_file}, session_id: {session_id}")

        return JSONResponse(content={
            "authenticated": False,
            "profile_complete": False,
            "message": "Authentication required"
        })

    except Exception as e:
        print("Server error:", e)
        return JSONResponse(status_code=500, content={
            "authenticated": False,
            "profile_complete": False,
            "error": str(e)
        })


@app.get("/api/auth-status/{auth_state_id}")
async def check_auth_status_by_state(auth_state_id: str):
    """Check authentication status using auth state ID for polling"""
    try:
        print(f"DEBUG: Checking auth status for state: {auth_state_id}")
        
        # Check if auth state exists and get associated session data
        auth_completion_key = f"auth_complete:{auth_state_id}"
        session_data = RedisManager.get_session_data(auth_completion_key)
        
        if session_data:
            print(f"DEBUG: Found completed auth for state {auth_state_id}")
            
            # Return the session data and clean up the temporary auth completion record  
            RedisManager.delete_session_data(auth_completion_key)
            
            return JSONResponse(content={
                "authenticated": True,
                "profile_complete": False,
                "requires_profile": True,
                "session_id": session_data.get('session_id'),
                "message": "Gmail authentication successful, profile completion required",
                "user_info": {
                    "name": session_data.get('name'),
                    "email": session_data.get('email')
                }
            })
        else:
            # Auth not completed yet
            print(f"DEBUG: Auth not completed yet for state {auth_state_id}")
            return JSONResponse(
                status_code=404,
                content={"message": "Authentication not completed yet"}
            )
            
    except Exception as e:
        print(f"Error checking auth status: {e}")
        return JSONResponse(status_code=500, content={
            "error": f"Failed to check auth status: {str(e)}"
        })




@app.post("/api/generate-email")
async def generate_email(params: EmailGenerationParams):
    """Generate email content based on provided parameters"""
    print(f"PARAMS: {params.tone}\n{params.type}\n{params.painPoints}\n{params.additionalRequirements}")
    try:
        # Determine email type content
        type_content = {
            'first-time': 'I hope this email finds you well. I\'m reaching out to discuss...',
            'follow-up': 'I wanted to follow up on our previous conversation regarding...',
            'thank-you': 'I wanted to express my sincere gratitude for...',
            'inquiry': 'I am writing to inquire about...'
        }
        
        # Determine tone-based closing
        tone_closing = {
            'formal': 'Respectfully yours,',
            'casual': 'Best,',
            'professional': 'Best regards,',
            'friendly': 'Warm regards,'
        }
        
        # Generate subject
        subject_prefix = {
            'follow-up': 'Follow-up: ',
            'thank-you': 'Thank you - ',
            'inquiry': 'Inquiry: ',
            'first-time': ''
        }
        
        subject = f"{subject_prefix.get(params.type, '')}{params.painPoints[:50]}..."
        
        # Generate body
        body = f"""Dear [Recipient Name],

{type_content.get(params.type, 'I hope this email finds you well.')}

I wanted to address the following concerns: {params.painPoints}

{params.additionalRequirements if params.additionalRequirements else ''}

I believe we can work together to find effective solutions that address these challenges. Please let me know when you might be available for a discussion.

{tone_closing.get(params.tone, 'Best regards,')}
[Your Name]"""
        
        return {
            "subject": subject,
            "body": body,
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate email: {str(e)}")



@app.post("/api/send-email")
async def send_email(
    email_request: EmailSendRequest,
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    try:
        if not x_session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")

        # 1. Retrieve credentials
        credentials = None
        user_info = None
        token_file = user_manager.get_user_token_file(x_session_id)

        if token_file:
            user_data = user_manager.get_user_info_from_token_file(token_file)
            if user_data and user_data.get('profile_complete'):
                credentials = Credentials.from_authorized_user_info(user_data['credentials'], SCOPES)
                user_info = user_data

        if not credentials:
            auth_data = RedisManager.get_session_data(x_session_id)
            if auth_data:
                credentials = Credentials.from_authorized_user_info(auth_data['credentials'], SCOPES)
                user_info = auth_data

        if not credentials:
            raise HTTPException(status_code=401, detail="No valid authentication found. Please authenticate first.")

        # 2. Refresh credentials if expired
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(GoogleRequest())
            if token_file and user_info:
                user_info['credentials'] = json.loads(credentials.to_json())
                user_info['last_updated'] = datetime.now().isoformat()
                with open(token_file, 'w') as f:
                    json.dump(user_info, f, indent=2)

        service = build('gmail', 'v1', credentials=credentials)
        # 3. Schedule or send
        if hasattr(email_request, "interval") and email_request.interval:
            email_sender.schedule_email_job(email_request, credentials, user_info,service,scheduler)
            return {"success": True, "scheduled": True, "message": "Email scheduled successfully."}
        else:
            return email_sender.send_email_now(email_request, credentials, user_info,service)

    except Exception as e:
        print(f"❌ Email operation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Email operation failed: {str(e)}")

    

@app.post("/api/register-user")
async def register_user(data: UserData, request: Request):
    """Register user with profile data and create permanent token file"""
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        print(f"DEBUG: Received session_id: {session_id}")
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get auth data from Redis
        auth_data = RedisManager.get_session_data(session_id)
        if not auth_data:
            raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        # Extract domain from email
        domain = user_manager.get_domain_from_email(auth_data['email'])
        
        # Create filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        username = auth_data['name'].replace(' ', '_').replace('.', '_')
        filename = f"{session_id}_{domain}_{username}_{timestamp}.json"
        filepath = os.path.join(TOKENS_FOLDER, filename)
        
        # Create permanent user data
        user_data = {
            'name': auth_data['name'],
            'email': auth_data['email'],
            'company_name': data.company_name,
            'designation': data.designation,
            'experience': data.experience,
            'credentials': auth_data['credentials'],
            'profile_complete': True,
            'created_at': datetime.now().isoformat(),
            'last_updated': datetime.now().isoformat()
        }
        
        # Save permanent token file
        with open(filepath, 'w') as f:
            json.dump(user_data, f, indent=2)
        
        # Remove from Redis
        # RedisManager.delete_session_data(session_id)
        
        print(f"✅ User registered successfully: {auth_data['name']} ({auth_data['email']})")
        print(f"📁 Token file created: {filepath}")
        print(f"🗑️ Removed from Redis")
        
        return {
            "success": True,
            "message": "User registered successfully",
            "authenticated": True,
            "profile_complete": True,
            "user_info": {
                "name": user_data['name'],
                "email": user_data['email'],
                "company_name": user_data['company_name'],
                "designation": user_data['designation'],
                "experience": user_data['experience']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")


@app.delete("/api/logout")
async def logout(request: Request):
    """Logout and remove stored credentials"""
    try:
        # Get session_id from headers
        session_id = request.headers.get('X-Session-ID')
        
        # Clear specific session from Redis if provided
        if session_id:
            RedisManager.delete_session_data(session_id)
        
        # Only remove the current user's token file (if it exists)
        if session_id:
            # Find and remove only the current user's token file
            token_file = user_manager.get_user_token_file(session_id)
            if token_file and os.path.exists(token_file):
                os.remove(token_file)
                print(f"🗑️ Removed token file: {token_file}")
            else:
                print(f"No token file found for session: {session_id}")
        
        # Note: We don't clear ALL Redis sessions or ALL token files
        # Each user should only logout their own session
        
        return {"message": "Logged out successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to logout: {str(e)}")


@app.post("/api/fetch_leads")
async def fetch_leads_v3(
    request: LeadSearchRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    ngrok_skip_browser_warning: Optional[str] = Header(None, alias="ngrok-skip-browser-warning")
):
    """
    Fetch leads based on search criteria - Version 3 (Clean response)
    """
    try:
        print(f"Received lead search request: {request}")
        print(f"Session ID: {x_session_id}")

        leads = lead_finder.fetch_leads(request)
        num_leads=0
        if leads:
            num_leads=len(leads)
        else:
            num_leads=0
        ICP_payload=lead_finder.generate_dynamic_icp_query(request)
        filtered_leads=lead_finder.filter_profiles(leads_data=leads)
        # Only include non-empty search criteria in response
        search_criteria = {}
        request_dict = request.dict()
        
        for key, value in request_dict.items():
            if value:  # Only include non-empty values
                search_criteria[key] = value

        return {
            "success": True,
            "leads": filtered_leads,
            "total_count": num_leads,
            "search_criteria": search_criteria,
            "session_id": x_session_id
        }

    except Exception as e:
        print(f"Error in fetch_leads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)