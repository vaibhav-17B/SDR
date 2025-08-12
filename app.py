from fastapi import FastAPI, HTTPException, Request, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from typing import Optional
import os
import json
import secrets
import time
from datetime import datetime
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from datetime import datetime
import uuid
import glob
import json
from datetime import datetime, timedelta
from base_models import (
    # Authentication models
    GmailAuthRequest, AuthStatusResponse, UserInfo,
    # Email models
    EmailSendRequest, EmailSendResponse, EmailGenerationParams, EmailGenerationResponse, 
    MultipleEmailGenerationResponse, EmailContent, RefineEmailRequest,
    # User management models
    UserData, UserRegistrationResponse, UserProfileUpdateRequest, UserProfileUpdateResponse,
    UserDeleteResponse, UserStats, UserStatsResponse,
    # Lead search models
    LeadSearchRequest, LeadSearchResponse,
    # Search history models
    SearchHistoryItem, SearchHistoryResponse, SearchByIdResponse, SearchDeleteResponse,
    # Mail sessions models
    MailCompositionList, MailListTemplates, EmailTemplate, CreateMailListRequest, 
    UpdateMailListRequest, UpdateListTemplateRequest, MailListsResponse, MailListTemplatesResponse,
    # Prospects list models
    ProspectData, ProspectsListItem, ProspectsListResponse, CreateProspectsListRequest,
    CreateProspectsListResponse, AddProspectsRequest, AddProspectsResponse,
    ProspectsListByIdResponse, DeleteProspectsListResponse, RemoveProspectResponse,
    AddCustomLeadRequest, AddCustomLeadResponse,
    # Campaign models
    CampaignChannel, CampaignMailStyle, CampaignAnalytics, CampaignData,
    CreateCampaignRequest, CreateCampaignResponse, UpdateCampaignRequest, UpdateCampaignResponse,
    CampaignsResponse, CampaignByIdResponse, DeleteCampaignResponse,
    # Common models
    LogoutResponse
)
from redis_helper import RedisSessionManager
from user_manager import UserManager
from utils import build_auth_html_response,email_helper
from leads_logic import LeadFinder
from apscheduler.schedulers.background import BackgroundScheduler
from csv_database import CSVUserDatabase
from search_history_manager import SearchHistoryManager
from prospects_list_manager import ProspectsListManager
from mail_lists_manager import MailListsManager
from campaigns_manager import CampaignManager
from studio import generate_multiple_emails, refine_email_content
from logging_config import (
    api_logger, log_requests_middleware
)
from logging_config import log_api_start as _log_api_start
from logging_config import log_api_success as _log_api_success
from logging_config import log_api_error as _log_api_error
from logging_config import get_session_logger as _get_session_logger
from logging_config import get_user_email_from_session as _get_user_email_from_session

TOKENS_FOLDER="tokens"
app = FastAPI()



RedisManager=RedisSessionManager()
lead_finder=LeadFinder(test=True)
user_manager=UserManager(redis_client=RedisManager)
email_sender=email_helper()
csv_db = CSVUserDatabase(tokens_folder=TOKENS_FOLDER, redis_manager=RedisManager)  # Initialize CSV database
search_history_manager = SearchHistoryManager()  # Initialize search history manager
prospects_list_manager = ProspectsListManager()  # Initialize prospects list manager
mail_lists_manager = MailListsManager()  # Initialize mail lists manager
campaign_manager = CampaignManager()  # Initialize campaign manager
scheduler = BackgroundScheduler(timezone="UTC")
scheduler.start()

# Create wrapper functions for logging that include the initialized managers
def log_api_start(endpoint_name: str, details: str = "", session_id: str = None, user_email: str = None):
    return _log_api_start(endpoint_name, details, session_id, user_email, RedisManager, user_manager, csv_db)

def log_api_success(endpoint_name: str, details: str = "", session_id: str = None, user_email: str = None):
    return _log_api_success(endpoint_name, details, session_id, user_email, RedisManager, user_manager, csv_db)

def log_api_error(endpoint_name: str, error: str, details: str = "", session_id: str = None, user_email: str = None):
    return _log_api_error(endpoint_name, error, details, session_id, user_email, RedisManager, user_manager, csv_db)

def get_session_logger(session_id: str, user_email: str = None):
    return _get_session_logger(session_id, user_email, RedisManager, user_manager, csv_db)

def get_user_email_from_session(session_id: str):
    return _get_user_email_from_session(session_id, RedisManager, user_manager, csv_db)


ALLOWED_ORIGINS = [
    "https://preview--quick-mail-craft.lovable.app",
    "https://83152ddb1df0.ngrok-free.app",  
    "http://localhost:8080",                          
]

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    return await log_requests_middleware(request, call_next, RedisManager, user_manager, csv_db)

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
REDIRECT_BASE_URL = os.getenv("REDIRECT_BASE_URL", "https://83152ddb1df0.ngrok-free.app")
print(f"REDIRECT_BASE_URL: {REDIRECT_BASE_URL}\n")


@app.get("/")
async def root():
    log_api_start("ROOT", "Health check endpoint")
    return {"message": "Gmail Email Composer API"}

@app.post("/api/authenticate-gmail")
async def start_gmail_auth(auth_request: GmailAuthRequest):
    log_api_start("GMAIL AUTH", f"Auth State: {auth_request.auth_state}")
    try:
        # Get auth state from request body
        frontend_auth_state = auth_request.auth_state
        
        if not frontend_auth_state:
            api_logger.error(f"❌ GMAIL AUTH ERROR - Missing auth_state parameter")
            return JSONResponse(
                status_code=400,
                content={"error": "Missing auth_state parameter"}
            )
        
        if not os.path.exists(CREDENTIALS_FILE):
            api_logger.error(f"❌ GMAIL AUTH ERROR - Credentials file not found: {CREDENTIALS_FILE}")
            return JSONResponse(
                status_code=500,
                content={"error": "Credentials file not found"}
            )

        redirect_uri = f"{REDIRECT_BASE_URL}/auth/callback"
        api_logger.info(f"🔄 GMAIL AUTH - Setting redirect URI: {redirect_uri}")

        flow = Flow.from_client_secrets_file(
            CREDENTIALS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        api_logger.info(f"🔄 GMAIL AUTH - OAuth flow created with scopes: {SCOPES}")

        # Use frontend auth state as OAuth state parameter
        # Also store it in Redis to track the auth flow
        if not RedisManager.store_oauth_state(frontend_auth_state, expiry_minutes=10):
            api_logger.error(f"❌ GMAIL AUTH ERROR - Failed to store OAuth state in Redis")
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to store OAuth state"}
            )
        api_logger.info(f"✅ GMAIL AUTH - OAuth state stored in Redis for 10 minutes")

        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=frontend_auth_state,  # Use frontend-provided state
            prompt='consent'
        )

        print("🔐 Redirect URI used for auth:", redirect_uri)   
        print("🔗 Frontend auth state:", frontend_auth_state)
        print("🔗 Full Authorization URL:", authorization_url)
        
        api_logger.info(f"✅ GMAIL AUTH SUCCESS - Authorization URL generated")
        api_logger.info(f"🔗 GMAIL AUTH - Redirect URI: {redirect_uri}")
        api_logger.info(f"🔗 GMAIL AUTH - Auth State: {frontend_auth_state}")

        return {"authorization_url": authorization_url}
    
    except Exception as e:
        api_logger.error(f"❌ GMAIL AUTH EXCEPTION - {str(e)}")
        print(f"Gmail auth error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to start authentication: {str(e)}"}
        )


@app.get("/auth/callback")
async def auth_callback(request: Request):
    """Handle OAuth callback and store authentication data in Redis"""
    log_api_start("AUTH CALLBACK", "OAuth callback processing")
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

        # Add/update user in CSV database
        csv_user_data = {
            'name': name,
            'email': email,
            'session_id': session_id,
            'profile_complete': False  # Will be updated when user completes profile
        }
        csv_result = csv_db.add_or_update_user(csv_user_data)
        print(f"📊 CSV Database: {csv_result}")

        # Check if user was previously deleted and needs re-registration
        if csv_result.get('was_deleted', False):
            print(f"⚠️ User {email} was previously deleted - requires re-registration")

        # IMPORTANT: Store auth completion data for polling using auth state
        auth_completion_data = {
            'session_id': session_id,
            'name': name,
            'email': email,
            'authenticated': True,
            'completed_at': datetime.now().isoformat(),
            'user_existed': csv_result.get('user_existed', False),
            'was_deleted': csv_result.get('was_deleted', False)
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
    log_api_start("CHECK AUTH", "Authentication status check")
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
                
                # Check if user exists in CSV database with complete profile
                user_email = auth_data.get('email')
                csv_user = csv_db.get_user_by_email(user_email) if user_email else None
                
                profile_complete = False
                user_info = {
                    "name": auth_data['name'],
                    "email": auth_data['email']
                }
                
                if csv_user and (not csv_db.is_user_deleted(user_email)):
                    # User exists in CSV and is not deleted
                    print(f"DEBUG: CSV user data for {user_email}: {csv_user}")
                    
                    company_name = str(csv_user.get('company_name', '')).strip()
                    designation = str(csv_user.get('designation', '')).strip()
                    work_experience = str(csv_user.get('work_experience', '')).strip()
                    
                    print(f"DEBUG: Profile fields - company: '{company_name}', designation: '{designation}', experience: '{work_experience}'")
                    
                    # Check if all required fields have meaningful values
                    has_company = company_name and company_name.lower() not in ['', 'nan', 'none', 'null']
                    has_designation = designation and designation.lower() not in ['', 'nan', 'none', 'null']
                    has_experience = work_experience and work_experience.lower() not in ['', 'nan', 'none', 'null']
                    
                    print(f"DEBUG: Profile validation - company: {has_company}, designation: {has_designation}, experience: {has_experience}")
                    
                    if has_company and has_designation and has_experience:
                        profile_complete = True
                        user_info.update({
                            "company_name": company_name,
                            "designation": designation,
                            "experience": work_experience
                        })
                        print(f"DEBUG: User {user_email} has complete profile in CSV")
                        
                        # Create token file for user with complete profile if it doesn't exist
                        if not token_file:
                            try:
                                # Extract domain from email
                                domain = user_manager.get_domain_from_email(user_email)
                                
                                # Create filename
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                username = auth_data['name'].replace(' ', '_').replace('.', '_')
                                filename = f"{session_id}_{domain}_{username}_{timestamp}.json"
                                filepath = os.path.join(TOKENS_FOLDER, filename)
                                
                                # Create permanent user data
                                token_user_data = {
                                    'name': auth_data['name'],
                                    'email': auth_data['email'],
                                    'company_name': company_name,
                                    'designation': designation,
                                    'experience': work_experience,
                                    'credentials': auth_data['credentials'],
                                    'profile_complete': True,
                                    'created_at': datetime.now().isoformat(),
                                    'last_updated': datetime.now().isoformat()
                                }
                                
                                # Save permanent token file
                                with open(filepath, 'w') as f:
                                    json.dump(token_user_data, f, indent=2)
                                
                                print(f"✅ Token file created for existing user: {filepath}")
                                
                            except Exception as e:
                                print(f"⚠️ Warning: Could not create token file for existing user: {e}")
                    else:
                        print(f"DEBUG: User {user_email} has incomplete profile in CSV - missing fields")
                
                return JSONResponse(content={
                    "authenticated": True,
                    "profile_complete": profile_complete,
                    "requires_profile": not profile_complete,
                    "message": "Gmail authentication successful" + ("" if profile_complete else ", profile completion required"),
                    "session_id": session_id,
                    "user_info": user_info
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
    log_api_start("AUTH STATUS", f"Checking status for auth_state_id: {auth_state_id}")
    try:
        print(f"DEBUG: Checking auth status for state: {auth_state_id}")
        
        # Check if auth state exists and get associated session data
        auth_completion_key = f"auth_complete:{auth_state_id}"
        session_data = RedisManager.get_session_data(auth_completion_key)
        
        if session_data:
            print(f"DEBUG: Found completed auth for state {auth_state_id}")
            
            # Check if user exists in CSV database with complete profile
            user_email = session_data.get('email')
            csv_user = csv_db.get_user_by_email(user_email) if user_email else None
            
            profile_complete = False
            user_info = {
                "name": session_data.get('name'),
                "email": session_data.get('email')
            }
            
            if csv_user and not csv_db.is_user_deleted(user_email):
                # User exists in CSV and is not deleted
                print(f"DEBUG AUTH-STATUS: CSV user data for {user_email}: {csv_user}")
                
                company_name = str(csv_user.get('company_name', '')).strip()
                designation = str(csv_user.get('designation', '')).strip()
                work_experience = str(csv_user.get('work_experience', '')).strip()
                
                print(f"DEBUG AUTH-STATUS: Profile fields - company: '{company_name}', designation: '{designation}', experience: '{work_experience}'")
                
                # Check if all required fields have meaningful values
                has_company = company_name and company_name.lower() not in ['', 'nan', 'none', 'null']
                has_designation = designation and designation.lower() not in ['', 'nan', 'none', 'null']
                has_experience = work_experience and work_experience.lower() not in ['', 'nan', 'none', 'null']
                
                print(f"DEBUG AUTH-STATUS: Profile validation - company: {has_company}, designation: {has_designation}, experience: {has_experience}")
                
                if has_company and has_designation and has_experience:
                    profile_complete = True
                    user_info.update({
                        "company_name": company_name,
                        "designation": designation,
                        "experience": work_experience
                    })
                    print(f"DEBUG AUTH-STATUS: User {user_email} has complete profile in CSV")
                    
                    # Create token file for user with complete profile if it doesn't exist
                    session_id = session_data.get('session_id')
                    if session_id:
                        token_file = user_manager.get_user_token_file(session_id)
                        if not token_file:
                            try:
                                # Extract domain from email
                                domain = user_manager.get_domain_from_email(user_email)
                                
                                # Create filename
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                username = session_data.get('name', 'unknown').replace(' ', '_').replace('.', '_')
                                filename = f"{session_id}_{domain}_{username}_{timestamp}.json"
                                filepath = os.path.join(TOKENS_FOLDER, filename)
                                
                                # Get credentials from Redis session
                                auth_data = RedisManager.get_session_data(session_id)
                                if auth_data and 'credentials' in auth_data:
                                    # Create permanent user data
                                    token_user_data = {
                                        'name': session_data.get('name'),
                                        'email': session_data.get('email'),
                                        'company_name': company_name,
                                        'designation': designation,
                                        'experience': work_experience,
                                        'credentials': auth_data['credentials'],
                                        'profile_complete': True,
                                        'created_at': datetime.now().isoformat(),
                                        'last_updated': datetime.now().isoformat()
                                    }
                                    
                                    # Save permanent token file
                                    with open(filepath, 'w') as f:
                                        json.dump(token_user_data, f, indent=2)
                                    
                                    print(f"✅ Token file created for existing user in auth-status: {filepath}")
                                else:
                                    print(f"⚠️ Warning: No credentials found in Redis for session {session_id}")
                                
                            except Exception as e:
                                print(f"⚠️ Warning: Could not create token file for existing user in auth-status: {e}")
                else:
                    print(f"DEBUG AUTH-STATUS: User {user_email} has incomplete profile in CSV - missing fields")
            
            # Return the session data and clean up the temporary auth completion record  
            RedisManager.delete_session_data(auth_completion_key)
            
            return JSONResponse(content={
                "authenticated": True,
                "profile_complete": profile_complete,
                "requires_profile": not profile_complete,
                "session_id": session_data.get('session_id'),
                "message": "Gmail authentication successful" + ("" if profile_complete else ", profile completion required"),
                "was_deleted": session_data.get('was_deleted', False),
                "user_info": user_info
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




@app.post("/api/generate-email", response_model=MultipleEmailGenerationResponse)
async def generate_email(request: EmailGenerationParams):
    """Generate multiple emails based on provided mail types and parameters"""
    api_logger.info(f"📝 EMAIL GENERATION START - Mail Types: {request.mail_types}")
    api_logger.info(f"📝 EMAIL GENERATION - Tone: {request.tone}")
    api_logger.info(f"📝 EMAIL GENERATION - Description: {request.description[:100]}...")
    api_logger.info(f"📝 EMAIL GENERATION - User Details: Name={request.user_name}, Company={request.user_company}")
    
    print(f"PARAMS: {request.tone}\n{request.mail_types}\n{request.description}\n{request.additional_requirements}")
    try:
        mail_types = request.mail_types
        tone = request.tone
        description = request.description
        additional_requirements = request.additional_requirements
        
        print(f"[DEBUG] Starting email generation for mail types: {mail_types}")
        api_logger.info(f"🔄 EMAIL GENERATION - Calling LLM service for {len(mail_types)} email types")
        
        # Generate multiple emails using studio.py
        generated_emails = await generate_multiple_emails(
            mail_types=mail_types,
            tone=tone,
            description=description,
            additional_requirements=additional_requirements,
            user_name=request.user_name,
            user_email=request.user_email,
            user_company=request.user_company,
            user_designation=request.user_designation,
            user_experience=request.user_experience
        )
        
        print(f"[DEBUG] Successfully generated {len(generated_emails)} emails")
        api_logger.info(f"✅ EMAIL GENERATION SUCCESS - Generated {len(generated_emails)} emails")
        
        # Log email titles for tracking
        for mail_type, content in generated_emails.items():
            api_logger.info(f"📧 EMAIL GENERATED - {mail_type}: '{content.subject[:50]}...'")
        
        return MultipleEmailGenerationResponse(
            success=True,
            message=f"Successfully generated {len(generated_emails)} emails",
            generated_emails=generated_emails
        )
        
    except Exception as e:
        print(f"[ERROR] Failed to generate emails: {str(e)}")
        api_logger.error(f"❌ EMAIL GENERATION ERROR - {str(e)}")
        api_logger.error(f"❌ EMAIL GENERATION - Mail Types: {mail_types}, Tone: {tone}")
        raise HTTPException(status_code=500, detail=f"Failed to generate emails: {str(e)}")


@app.post("/api/refine-email", response_model=EmailGenerationResponse)
async def refine_email(request: RefineEmailRequest):
    """Refine email content based on user instructions"""
    log_api_start("REFINE EMAIL", f"Subject: '{request.original_subject[:50]}...', Instructions: '{request.refinement_instructions[:50]}...'")
    print(f"REFINE EMAIL PARAMS: Original Subject: {request.original_subject[:50]}...")
    print(f"Refinement Instructions: {request.refinement_instructions}")
    
    try:
        print(f"[DEBUG] Starting email refinement")
        
        # Refine email using studio.py
        refined_email = await refine_email_content(request)
        
        print(f"[DEBUG] Successfully refined email")
        
        return EmailGenerationResponse(
            subject=refined_email.subject,
            body=refined_email.body,
            success=True
        )
        
    except Exception as e:
        print(f"[ERROR] Failed to refine email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to refine email: {str(e)}")


@app.post("/api/send-email")
async def send_email(
    email_request: EmailSendRequest,
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    log_api_start("EMAIL SEND", f"Recipients: {len(email_request.to)}, Subject: '{email_request.subject[:50]}...'", x_session_id)
    try:
        if not x_session_id:
            api_logger.error(f"❌ EMAIL SEND ERROR - No session ID provided")
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")

        # 1. Retrieve credentials
        credentials = None
        user_info = None
        token_file = user_manager.get_user_token_file(x_session_id)
        api_logger.info(f"🔄 EMAIL SEND - Retrieving user token file: {token_file}")

        if token_file:
            user_data = user_manager.get_user_info_from_token_file(token_file)
            if user_data and user_data.get('profile_complete'):
                credentials = Credentials.from_authorized_user_info(user_data['credentials'], SCOPES)
                user_info = user_data
                
                # Extract user email for logging if available
                user_email = None
                if user_info and 'user_info' in user_info and 'email' in user_info['user_info']:
                    user_email = user_info['user_info']['email']
                    print(f"DEBUG: EMAIL SEND - Found user email: {user_email}")
                    # Re-log with user email
                    log_api_start("EMAIL SEND", f"Recipients: {len(email_request.to)}, Subject: '{email_request.subject[:50]}...', User: {user_email}", x_session_id, user_email)

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

    

@app.post("/api/register-user", response_model=UserRegistrationResponse)
async def register_user(data: UserData, request: Request):
    """Register user with profile data and create permanent token file"""
    session_id = request.headers.get('X-Session-ID')
    log_api_start("USER REGISTRATION", f"Company: {data.company_name}, Designation: {data.designation}", session_id)
    try:
        # Get session_id from request headers  
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
        
        # Update CSV database with complete profile
        csv_profile_data = {
            'name': auth_data['name'],
            'email': auth_data['email'],
            'company_name': data.company_name,
            'designation': data.designation,
            'experience': data.experience,
            'session_id': session_id,
            'profile_complete': True
        }
        csv_result = csv_db.add_or_update_user(csv_profile_data)
        print(f"📊 CSV Profile Update: {csv_result}")
        
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


@app.delete("/api/logout", response_model=LogoutResponse)
async def logout(request: Request):
    """Logout and remove stored credentials"""
    log_api_start("LOGOUT", "User logout request")
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


@app.post("/api/fetch_leads", response_model=LeadSearchResponse)
async def fetch_leads_v3(
    request: LeadSearchRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    ngrok_skip_browser_warning: Optional[str] = Header(None, alias="ngrok-skip-browser-warning")
):
    """
    Fetch leads based on search criteria - Version 3 (Clean response)
    """
    log_api_start("LEAD SEARCH", f"Job Titles: {request.job_titles}, Companies: {request.company_names}", x_session_id)
    try:
        print(f"Received lead search request: {request}")
        print(f"Session ID: {x_session_id}")

        api_logger.info(f"🔄 LEAD SEARCH - Calling lead_finder service")
        leads = lead_finder.fetch_leads(request)
        num_leads=0
        if leads:
            num_leads=len(leads)
        else:
            num_leads=0
        
        api_logger.info(f"✅ LEAD SEARCH SUCCESS - Found {num_leads} leads")
        
        ICP_payload=lead_finder.generate_dynamic_icp_query(request)
        filtered_leads=lead_finder.filter_profiles(leads_data=leads)
        api_logger.info(f"🔄 LEAD SEARCH - Filtered to {len(filtered_leads) if filtered_leads else 0} qualified leads")
        # Only include non-empty search criteria in response
        search_criteria = {}
        request_dict = request.dict()
        
        for key, value in request_dict.items():
            if value:  # Only include non-empty values
                search_criteria[key] = value

        # Save search history for authenticated users
        user_email = None
        if x_session_id:
            # Get user email from session
            auth_data = RedisManager.get_session_data(x_session_id)
            if auth_data:
                user_email = auth_data.get('email')
            else:
                # Try to get from token file
                token_file = user_manager.get_user_token_file(x_session_id)
                if token_file:
                    user_info = user_manager.get_user_info_from_token_file(token_file)
                    if user_info:
                        user_email = user_info.get('email')
        
        # Save search history if user is identified
        search_id = None
        if user_email and filtered_leads:
            print(f"💾 SAVING SEARCH HISTORY:")
            print(f"   User: {user_email}")
            print(f"   Results count: {len(filtered_leads)}")
            print(f"   Search params: {list(search_criteria.keys())}")
            
            search_id = search_history_manager.save_search_history(
                user_email=user_email,
                search_params=search_criteria,
                search_results=filtered_leads
            )
            print(f"✅ Search history saved with ID: {search_id}")
        elif user_email and not filtered_leads:
            print(f"⚠️ No search history saved: No results found for user {user_email}")
        elif not user_email:
            print(f"⚠️ No search history saved: User not authenticated")

        return {
            "success": True,
            "leads": filtered_leads,
            "total_count": num_leads,
            "search_criteria": search_criteria,
            "session_id": x_session_id,
            "search_id": search_id
        }

    except Exception as e:
        print(f"Error in fetch_leads: {str(e)}")
        log_api_error("LEAD SEARCH", str(e), f"Session: {x_session_id}", x_session_id)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/search-history", response_model=SearchHistoryResponse)
async def get_search_history(
    request: Request,
    limit: int = 10,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get user's search history"""
    log_api_start("GET SEARCH HISTORY", f"limit={limit}, session_id={x_session_id}")
    print(f"\n🔍 API CALL: GET_SEARCH_HISTORY")
    print(f"📝 Parameters: limit={limit}, session_id={x_session_id}")
    
    try:
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user email from session
        user_email = None
        auth_data = RedisManager.get_session_data(x_session_id)
        if auth_data:
            user_email = auth_data.get('email')
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Get search history
        print(f"📊 Fetching search history for user: {user_email} (limit: {limit})")
        history = search_history_manager.get_user_search_history(user_email, limit=limit)
        
        response_data = {
            "success": True,
            "user_email": user_email,
            "search_history": history,
            "total_searches": len(history)
        }
        
        print(f"✅ API SUCCESS: GET_SEARCH_HISTORY")
        print(f"📤 Response: Found {len(history)} search records for {user_email}")
        for i, search in enumerate(history):
            print(f"   Search {i+1}: {search['search_id']} - {search['search_date']} - {search['total_results']} results")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ API ERROR: GET_SEARCH_HISTORY failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get search history: {str(e)}")


@app.get("/api/search-history/{search_id}", response_model=SearchByIdResponse)
async def get_search_by_id(
    search_id: str,
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get specific search by ID"""
    log_api_start("GET SEARCH BY ID", f"search_id={search_id}, session_id={x_session_id}")
    print(f"\n🔍 API CALL: GET_SEARCH_BY_ID")
    print(f"📝 Parameters: search_id={search_id}, session_id={x_session_id}")
    
    try:
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user email from session
        user_email = None
        auth_data = RedisManager.get_session_data(x_session_id)
        if auth_data:
            user_email = auth_data.get('email')
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Get specific search
        print(f"🔎 Searching for specific search ID: {search_id} for user: {user_email}")
        search_data = search_history_manager.get_search_by_id(user_email, search_id)
        
        if not search_data:
            print(f"❌ API ERROR: Search {search_id} not found for user {user_email}")
            raise HTTPException(status_code=404, detail="Search not found")
        
        response_data = {
            "success": True,
            "search_data": search_data
        }
        
        print(f"✅ API SUCCESS: GET_SEARCH_BY_ID")
        print(f"📤 Response: Found search {search_id} - {search_data['search_date']} - {search_data['total_results']} results")
        print(f"📊 Search params: {list(search_data['search_params'].keys())}")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ API ERROR: GET_SEARCH_BY_ID failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get search: {str(e)}")


@app.delete("/api/search-history/{search_id}", response_model=SearchDeleteResponse)
async def delete_search_history(
    search_id: str,
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Delete specific search from history"""
    log_api_start("DELETE SEARCH HISTORY", f"search_id={search_id}, session_id={x_session_id}")
    print(f"\n🗑️ API CALL: DELETE_SEARCH_HISTORY")
    print(f"📝 Parameters: search_id={search_id}, session_id={x_session_id}")
    
    try:
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user email from session
        user_email = None
        auth_data = RedisManager.get_session_data(x_session_id)
        if auth_data:
            user_email = auth_data.get('email')
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Delete search
        print(f"🗑️ Attempting to delete search {search_id} for user: {user_email}")
        success = search_history_manager.delete_search_history(user_email, search_id)
        
        if not success:
            print(f"❌ API ERROR: Failed to delete search {search_id}")
            raise HTTPException(status_code=500, detail="Failed to delete search")
        
        response_data = {
            "success": True,
            "message": f"Search {search_id} deleted successfully"
        }
        
        print(f"✅ API SUCCESS: DELETE_SEARCH_HISTORY")
        print(f"📤 Response: Successfully deleted search {search_id} for {user_email}")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ API ERROR: DELETE_SEARCH_HISTORY failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete search: {str(e)}")


@app.post("/api/change-profile", response_model=UserProfileUpdateResponse)
async def change_profile(data: UserProfileUpdateRequest, request: Request):
    """Update user profile information"""
    log_api_start("CHANGE PROFILE", f"company={data.company_name}, designation={data.designation}")
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        print(f"DEBUG: Received session_id for profile change: {session_id}")
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        # Check if user exists in CSV and is not deleted
        if not csv_db.user_exists(user_email):
            raise HTTPException(status_code=404, detail="User not found in database")
        
        if csv_db.is_user_deleted(user_email):
            raise HTTPException(status_code=403, detail="User profile is deleted. Please re-register.")
        
        # Update profile in CSV database
        profile_data = {
            'company_name': data.company_name,
            'designation': data.designation,
            'experience': data.experience
        }
        csv_result = csv_db.update_user_profile(user_email, profile_data)
        
        if not csv_result.get('success'):
            raise HTTPException(status_code=500, detail=csv_result.get('error', 'Failed to update profile'))
        
        # Update token file if it exists
        if token_file:
            try:
                with open(token_file, 'r') as f:
                    token_data = json.load(f)
                
                token_data.update({
                    'company_name': data.company_name,
                    'designation': data.designation,  
                    'experience': data.experience,
                    'last_updated': datetime.now().isoformat()
                })
                
                with open(token_file, 'w') as f:
                    json.dump(token_data, f, indent=2)
                
                print(f"📁 Updated token file: {token_file}")
            except Exception as e:
                print(f"⚠️ Warning: Could not update token file: {e}")
        
        print(f"✅ Profile updated successfully for: {user_email}")
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "profile_updates": csv_result.get('profile_updates', 0),
            "user_info": {
                "company_name": data.company_name,
                "designation": data.designation,
                "experience": data.experience
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@app.delete("/api/delete-profile", response_model=UserDeleteResponse)
async def delete_profile(request: Request):
    """Delete user profile (mark as deleted in CSV)"""
    log_api_start("DELETE PROFILE", "User profile deletion request")
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        print(f"DEBUG: Received session_id for profile deletion: {session_id}")
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        # Check if user exists in CSV
        if not csv_db.user_exists(user_email):
            raise HTTPException(status_code=404, detail="User not found in database")
        
        # Mark user as deleted in CSV database
        csv_result = csv_db.delete_user_profile(user_email)
        
        if not csv_result.get('success'):
            raise HTTPException(status_code=500, detail=csv_result.get('error', 'Failed to delete profile'))
        
        # Remove token file if it exists
        if token_file and os.path.exists(token_file):
            os.remove(token_file)
            print(f"🗑️ Removed token file: {token_file}")
        
        # Clear Redis session
        RedisManager.delete_session_data(session_id)
        
        print(f"✅ Profile deleted successfully for: {user_email}")
        
        return {
            "success": True,
            "message": "Profile deleted successfully",
            "delete_count": csv_result.get('delete_count', 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete profile: {str(e)}")


@app.get("/api/user-stats", response_model=UserStatsResponse)
async def get_user_stats(request: Request):
    """Get user statistics from CSV database"""
    log_api_start("GET USER STATS", "User statistics request")
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        # Get user stats from CSV database
        stats = csv_db.get_user_stats(user_email)
        
        if not stats:
            raise HTTPException(status_code=404, detail="User not found in database")
        
        return {
            "success": True,
            "user_email": user_email,
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting user stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user stats: {str(e)}")


# Prospects Lists Endpoints

@app.get("/api/prospects-lists", response_model=ProspectsListResponse)
async def get_prospects_lists(request: Request):
    """Get all prospects lists for the authenticated user"""
    log_api_start("GET PROSPECTS LISTS", "Fetching user prospects lists")
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"\n📋 API REQUEST: GET_PROSPECTS_LISTS for {user_email}")
        
        # Get prospects lists from manager
        prospects_lists = prospects_list_manager.get_user_prospects_lists(user_email)
        
        print(f"✅ Retrieved {len(prospects_lists)} prospects lists for {user_email}")
        
        return {
            "success": True,
            "user_email": user_email,
            "total_lists": len(prospects_lists),
            "prospects_lists": prospects_lists
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting prospects lists: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get prospects lists: {str(e)}")


@app.post("/api/prospects-lists", response_model=CreateProspectsListResponse)
async def create_prospects_list(prospects_request: CreateProspectsListRequest, request: Request):
    """Create a new prospects list"""
    log_api_start("CREATE PROSPECTS LIST", f"list_name={prospects_request.list_name}")
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        # Get request data from Pydantic model
        list_name = prospects_request.list_name.strip()
        description = prospects_request.description.strip()
        prospects = prospects_request.prospects
        tags = prospects_request.tags or []
        
        if not list_name:
            raise HTTPException(status_code=400, detail="List name is required")
        
        print(f"\n➕ API REQUEST: CREATE_PROSPECTS_LIST for {user_email}")
        print(f"List name: {list_name}")
        print(f"Description: {description}")
        print(f"Prospects count: {len(prospects)}")
        
        # Create prospects list
        list_id = prospects_list_manager.create_prospects_list(
            user_email=user_email,
            list_name=list_name,
            prospects=prospects,
            description=description,
            tags=tags
        )
        
        if not list_id:
            raise HTTPException(status_code=500, detail="Failed to create prospects list")
        
        print(f"✅ Created prospects list: {list_id} for {user_email}")
        
        return {
            "success": True,
            "list_id": list_id,
            "list_name": list_name,
            "message": f"Prospects list '{list_name}' created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating prospects list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create prospects list: {str(e)}")


@app.post("/api/prospects-lists/{list_id}/add-prospects", response_model=AddProspectsResponse)
async def add_prospects_to_list(list_id: str, add_prospects_request: AddProspectsRequest, request: Request):
    """Add prospects to an existing list"""
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        # Get prospects from Pydantic model
        prospects = add_prospects_request.prospects
        
        if not prospects:
            raise HTTPException(status_code=400, detail="No prospects provided")
        
        print(f"\n➕ API REQUEST: ADD_PROSPECTS_TO_LIST for {user_email}")
        print(f"List ID: {list_id}")
        print(f"Prospects count: {len(prospects)}")
        
        # Add prospects to list
        success = prospects_list_manager.add_prospects_to_list(
            user_email=user_email,
            list_id=list_id,
            new_prospects=prospects
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="List not found or failed to add prospects")
        
        print(f"✅ Added prospects to list: {list_id} for {user_email}")
        
        return {
            "success": True,
            "list_id": list_id,
            "message": f"Added {len(prospects)} prospects to list"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error adding prospects to list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add prospects to list: {str(e)}")


@app.delete("/api/prospects-lists/{list_id}", response_model=DeleteProspectsListResponse)
async def delete_prospects_list(list_id: str, request: Request):
    """Delete a prospects list"""
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"\n🗑️ API REQUEST: DELETE_PROSPECTS_LIST for {user_email}")
        print(f"List ID: {list_id}")
        
        # Delete prospects list
        success = prospects_list_manager.delete_prospects_list(
            user_email=user_email,
            list_id=list_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="List not found or failed to delete")
        
        print(f"✅ Deleted prospects list: {list_id} for {user_email}")
        
        return {
            "success": True,
            "list_id": list_id,
            "message": "Prospects list deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting prospects list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete prospects list: {str(e)}")


@app.get("/api/prospects-lists/{list_id}", response_model=ProspectsListByIdResponse)
async def get_prospects_list_by_id(list_id: str, request: Request):
    """Get a specific prospects list by ID"""
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"\n📋 API REQUEST: GET_PROSPECTS_LIST_BY_ID for {user_email}")
        print(f"List ID: {list_id}")
        
        # Get prospects list by ID
        prospects_list = prospects_list_manager.get_prospects_list_by_id(
            user_email=user_email,
            list_id=list_id
        )
        
        if not prospects_list:
            raise HTTPException(status_code=404, detail="Prospects list not found")
        
        print(f"✅ Retrieved prospects list: {list_id} for {user_email}")
        
        return {
            "success": True,
            "prospects_list": prospects_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting prospects list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get prospects list: {str(e)}")


@app.delete("/api/prospects-lists/{list_id}/prospects/{prospect_index}", response_model=RemoveProspectResponse)
async def remove_prospect_from_list(list_id: str, prospect_index: int, request: Request):
    """Remove a prospect from a list by index"""
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"\n🗑️ API REQUEST: REMOVE_PROSPECT_FROM_LIST for {user_email}")
        print(f"List ID: {list_id}")
        print(f"Prospect Index: {prospect_index}")
        
        # Remove prospect from list
        success = prospects_list_manager.remove_prospect_from_list(
            user_email=user_email,
            list_id=list_id,
            prospect_index=prospect_index
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="List not found or failed to remove prospect")
        
        print(f"✅ Removed prospect from list: {list_id} for {user_email}")
        
        return {
            "success": True,
            "list_id": list_id,
            "message": "Prospect removed from list successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error removing prospect from list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to remove prospect from list: {str(e)}")

@app.post("/api/prospects-lists/{list_id}/custom-lead", response_model=AddCustomLeadResponse)
async def add_custom_lead_to_list(list_id: str, add_custom_lead_request: AddCustomLeadRequest, request: Request):
    """Add a custom lead to an existing prospects list"""
    try:
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        # Get custom lead data from request
        custom_lead = add_custom_lead_request.custom_lead
        
        if not custom_lead:
            raise HTTPException(status_code=400, detail="No custom lead data provided")
        
        # Validate required fields
        required_fields = ['personal_information', 'current_position', 'contact_information']
        missing_fields = []
        
        for field in required_fields:
            if field not in custom_lead:
                missing_fields.append(field)
        
        if missing_fields:
            raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate specific required data
        personal_info = custom_lead.get('personal_information', {})
        current_position = custom_lead.get('current_position', {})
        contact_info = custom_lead.get('contact_information', {})
        
        if not personal_info.get('full_name'):
            raise HTTPException(status_code=400, detail="Full name is required in personal_information")
        
        if not current_position.get('title'):
            raise HTTPException(status_code=400, detail="Position title is required in current_position")
        
        if not contact_info.get('primary_email'):
            raise HTTPException(status_code=400, detail="Email is required in contact_information")
        
        print(f"\n➕ API REQUEST: ADD_CUSTOM_LEAD_TO_LIST for {user_email}")
        print(f"List ID: {list_id}")
        print(f"Custom Lead: {personal_info.get('full_name')} ({contact_info.get('primary_email')})")
        
        # Add custom lead to list
        success = prospects_list_manager.add_custom_lead_to_list(
            user_email=user_email,
            list_id=list_id,
            custom_lead=custom_lead
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="List not found or failed to add custom lead (email may already exist)")
        
        print(f"✅ Added custom lead to list: {list_id} for {user_email}")
        
        return {
            "success": True,
            "list_id": list_id,
            "message": "Custom lead added to list successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error adding custom lead to list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add custom lead to list: {str(e)}")

# ============ MAIL SESSIONS ENDPOINTS ============

@app.get("/api/mail-sessions", response_model=MailListsResponse)
async def get_mail_lists(request: Request):
    """Get all mail composition lists for the authenticated user"""
    log_api_start("GET MAIL SESSIONS", "Fetching mail composition lists")
    try:
        print(f"\n📧 API REQUEST: GET_MAIL_LISTS")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        print(f"📧 Fetching mail composition lists for user: {user_email}")
        
        # Get mail composition lists from manager
        mail_lists = mail_lists_manager.get_all_lists(user_email=user_email)
        
        print(f"✅ Retrieved {len(mail_lists)} mail composition lists for {user_email}")
        print(f"[DEBUG] Mail Lists: {mail_lists}")
        return {
            "success": True,
            "mail_lists": mail_lists,     # Change from mail_sessions
            "total_lists": len(mail_lists),           # Change from total_sessions
            "user_email": user_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching mail sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch mail sessions: {str(e)}")

@app.post("/api/mail-sessions")
async def create_mail_list(list_request: CreateMailListRequest, request: Request):
    """Create a new mail composition list"""
    try:
        print(f"\n➕ API REQUEST: CREATE_MAIL_LIST")
        print(f"API Body Params:{list_request.dict()}")
        print(f"List name: {list_request.list_name}")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Create mail composition list
        new_session = mail_lists_manager.create_list(list_request, user_email)
        
        print(f"✅ Created mail composition list: {new_session.list_id} for {user_email}")
        
        return {
            "success": True,
            "session": new_session,
            "message": "Mail composition list created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating mail session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create mail session: {str(e)}")

@app.put("/api/mail-sessions/{session_id}")
async def update_mail_session(session_id: str, session_request: UpdateMailListRequest, request: Request):
    """Update an existing mail session"""
    try:
        print(f"\n📝 API REQUEST: UPDATE_MAIL_SESSION")
        print(f"Session ID: {session_id}")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Ensure session_id matches the URL parameter
        session_request.session_id = session_id
        
        # Update mail session metadata
        updated_session = mail_lists_manager.update_list_metadata(session_request, user_email)
        
        if not updated_session:
            raise HTTPException(status_code=404, detail="Mail session not found")
        
        print(f"✅ Updated mail session: {session_id} for {user_email}")
        
        return {
            "success": True,
            "session": updated_session,
            "message": "Mail session updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating mail session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update mail session: {str(e)}")

@app.delete("/api/mail-sessions/{list_id}")
async def delete_mail_session(list_id: str, request: Request):
    """Delete a mail session"""
    try:
        print(f"\n🗑️ API REQUEST: DELETE_MAIL_SESSION")
        print(f"List ID: {list_id}")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Delete mail session
        success = mail_lists_manager.delete_list(list_id, user_email)
        
        if not success:
            raise HTTPException(status_code=404, detail="Mail session not found")
        
        print(f"✅ Deleted mail session: {list_id} for {user_email}")
        
        return {
            "success": True,
            "message": "Mail session deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting mail session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete mail session: {str(e)}")

@app.get("/api/mail-sessions/{session_id}/templates", response_model=MailListTemplatesResponse)
async def get_session_templates(session_id: str, request: Request):
    """Get session with all email templates"""
    try:
        print(f"\n📧 API REQUEST: GET_SESSION_TEMPLATES")
        print(f"Session ID: {session_id}")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Get session templates
        list_templates = mail_lists_manager.get_list_templates(user_email, session_id)
        
        if not list_templates:
            raise HTTPException(status_code=404, detail="Session templates not found")
        
        print(f"✅ Retrieved list templates for: {session_id}")
        
        return {
            "success": True,
            "list": list_templates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching session templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch session templates: {str(e)}")

@app.put("/api/mail-sessions/{session_id}/templates")
async def update_session_templates(session_id: str, templates_update: UpdateListTemplateRequest, request: Request):
    """Update specific template in session"""
    try:
        print(f"\n✏️ API REQUEST: UPDATE_SESSION_TEMPLATES")
        print(f"Session ID: {session_id}")
        print(f"Template ID: {templates_update.template_id}")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Get current session templates
        session_templates = mail_lists_manager.get_list_templates(user_email, session_id)
        
        if not session_templates:
            raise HTTPException(status_code=404, detail="Session templates not found")
        
        # Update the specific template
        template_found = False
        for template in session_templates.templates:
            if template.template_id == templates_update.template_id:
                # Update fields if provided
                if templates_update.template_name is not None:
                    template.template_name = templates_update.template_name
                if templates_update.subject is not None:
                    template.subject = templates_update.subject
                if templates_update.body is not None:
                    template.body = templates_update.body
                if templates_update.cc is not None:
                    template.cc = templates_update.cc
                if templates_update.bcc is not None:
                    template.bcc = templates_update.bcc
                
                # Update timestamp
                template.last_updated = datetime.now().strftime("%Y-%m-%d")
                template_found = True
                break
        
        if not template_found:
            raise HTTPException(status_code=404, detail=f"Template '{templates_update.template_id}' not found")
        
        # Save updated templates
        success = mail_lists_manager.update_list_templates(user_email, session_id, session_templates.templates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update session templates")
        
        print(f"✅ Updated template {templates_update.template_id} in session {session_id}")
        
        return {
            "success": True,
            "message": "Session template updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating session templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update session templates: {str(e)}")

@app.put("/api/mail-sessions/{session_id}/templates/batch")
async def update_all_session_templates(session_id: str, request: Request):
    """Update all session templates at once"""
    try:
        print(f"\n📧 API REQUEST: UPDATE_ALL_SESSION_TEMPLATES")
        print(f"Session ID: {session_id}")
        
        # Get session ID from headers
        x_session_id = request.headers.get("x-session-id")
        if not x_session_id:
            print(f"❌ API ERROR: No session ID provided")
            raise HTTPException(status_code=401, detail="Session ID required")
        
        # Parse request body
        body = await request.json()
        templates_data = body.get('templates', [])
        
        if not templates_data:
            raise HTTPException(status_code=400, detail="No templates data provided")
        
        print(f"📧 Received {len(templates_data)} templates to save")
        
        # Get user email from session
        user_email = None
        session_data = RedisManager.get_session_data(x_session_id)
        
        if session_data and 'user_email' in session_data:
            user_email = session_data['user_email']
            print(f"✅ Found user email from Redis: {user_email}")
        else:
            # Try to get from token file
            token_file = user_manager.get_user_token_file(x_session_id)
            if token_file:
                user_info = user_manager.get_user_info_from_token_file(token_file)
                if user_info:
                    user_email = user_info.get('email')
                    print(f"✅ Found user email from token file: {user_email}")
        
        if not user_email:
            print(f"❌ API ERROR: User email not found for session {x_session_id}")
            raise HTTPException(status_code=401, detail="User email not found. Please authenticate first.")
        
        # Check if the list exists (but templates may not be saved yet)
        lists = mail_lists_manager.get_all_lists(user_email)
        list_exists = any(list_item.list_id == session_id for list_item in lists)
        
        if not list_exists:
            raise HTTPException(status_code=404, detail="Mail list not found")
        
        print(f"✅ Found mail list: {session_id}, proceeding with template save")
        
        # Convert template data to EmailTemplate objects
        print(f"📧 Processing {len(templates_data)} templates:")
        updated_templates = []
        for i, template_data in enumerate(templates_data):
            print(f"  Template {i+1}: {template_data.get('template_id')} - Subject: '{template_data.get('subject', '')[:50]}...'")
            email_template = EmailTemplate(
                template_id=template_data.get('template_id'),
                template_name=template_data.get('template_name'),
                subject=template_data.get('subject', ''),
                body=template_data.get('body', ''),
                cc=template_data.get('cc', ''),
                bcc=template_data.get('bcc', ''),
                created_date=template_data.get('created_date', datetime.now().strftime("%Y-%m-%d")),
                last_updated=datetime.now().strftime("%Y-%m-%d")
            )
            updated_templates.append(email_template)
        
        # Save all updated templates
        success = mail_lists_manager.update_list_templates(user_email, session_id, updated_templates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update all session templates")
        
        print(f"✅ Updated all {len(updated_templates)} templates in session {session_id}")
        
        return {
            "success": True,
            "message": f"Successfully updated {len(updated_templates)} email templates",
            "templates_count": len(updated_templates)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating all session templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update all session templates: {str(e)}")

# ============ CAMPAIGN ENDPOINTS ============

@app.get("/api/campaigns", response_model=CampaignsResponse)
async def get_campaigns(request: Request):
    """Get all campaigns for the authenticated user"""
    log_api_start("GET CAMPAIGNS")
    try:
        print(f"\n📋 API REQUEST: GET_CAMPAIGNS")
        
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"📝 API Parameters: user_email={user_email}")
        
        # Get campaigns from campaign manager
        campaigns = campaign_manager.get_user_campaigns(user_email)
        
        print(f"✅ Retrieved {len(campaigns)} campaigns for {user_email}")
        log_api_success("GET CAMPAIGNS", f"Retrieved {len(campaigns)} campaigns for {user_email}")
        
        return {
            "success": True,
            "user_email": user_email,
            "total_campaigns": len(campaigns),
            "campaigns": campaigns
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting campaigns: {str(e)}")
        log_api_error("GET CAMPAIGNS", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get campaigns: {str(e)}")

@app.post("/api/campaigns", response_model=CreateCampaignResponse)
async def create_campaign(create_campaign_request: CreateCampaignRequest, request: Request):
    """Create a new campaign"""
    log_api_start("CREATE CAMPAIGN", f"campaign_name={create_campaign_request.campaign_name}")
    try:
        print(f"\n➕ API REQUEST: CREATE_CAMPAIGN")
        
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"📝 API Parameters:")
        print(f"   user_email: {user_email}")
        print(f"   campaign_name: {create_campaign_request.campaign_name}")
        print(f"   description: {create_campaign_request.description}")
        print(f"   channels: {create_campaign_request.channels}")
        print(f"   mail_styles: {create_campaign_request.mail_styles}")
        
        # Convert Pydantic models to dicts for the campaign manager
        channels = [channel.dict() for channel in create_campaign_request.channels] if create_campaign_request.channels else None
        mail_styles = [style.dict() for style in create_campaign_request.mail_styles] if create_campaign_request.mail_styles else None
        
        # Create campaign
        campaign_id = campaign_manager.create_campaign(
            user_email=user_email,
            campaign_name=create_campaign_request.campaign_name,
            description=create_campaign_request.description,
            channels=channels,
            mail_styles=mail_styles,
            prospects_list_id=create_campaign_request.prospects_list_id,
            prospects_count=create_campaign_request.prospects_count or 0
        )
        
        if not campaign_id:
            raise HTTPException(
                status_code=400, 
                detail=f"Campaign name '{create_campaign_request.campaign_name}' already exists. Please choose a different name."
            )
        
        print(f"✅ Created campaign: {campaign_id} for {user_email}")
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "message": "Campaign created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@app.get("/api/campaigns/{campaign_id}", response_model=CampaignByIdResponse)
async def get_campaign_by_id(campaign_id: str, request: Request):
    """Get specific campaign by ID"""
    try:
        print(f"\n📋 API REQUEST: GET_CAMPAIGN_BY_ID")
        
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"📝 API Parameters: user_email={user_email}, campaign_id={campaign_id}")
        
        # Get campaign by ID
        campaign = campaign_manager.get_campaign_by_id(user_email, campaign_id)
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        print(f"✅ Retrieved campaign: {campaign_id} for {user_email}")
        
        return {
            "success": True,
            "campaign": campaign
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get campaign: {str(e)}")

@app.put("/api/campaigns/{campaign_id}", response_model=UpdateCampaignResponse)
async def update_campaign(campaign_id: str, update_campaign_request: UpdateCampaignRequest, request: Request):
    """Update a campaign"""
    try:
        print(f"\n✏️ API REQUEST: UPDATE_CAMPAIGN")
        
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"📝 API Parameters: user_email={user_email}, campaign_id={campaign_id}")
        
        # Prepare updates dict
        updates = {}
        if update_campaign_request.campaign_name is not None:
            updates['campaign_name'] = update_campaign_request.campaign_name
        if update_campaign_request.description is not None:
            updates['description'] = update_campaign_request.description
        if update_campaign_request.channels is not None:
            updates['channels'] = [channel.dict() for channel in update_campaign_request.channels]
        if update_campaign_request.mail_styles is not None:
            updates['mail_styles'] = [style.dict() for style in update_campaign_request.mail_styles]
        if update_campaign_request.prospects_list_id is not None:
            updates['prospects_list_id'] = update_campaign_request.prospects_list_id
        if update_campaign_request.prospects_count is not None:
            updates['prospects_count'] = update_campaign_request.prospects_count
        if update_campaign_request.status is not None:
            updates['status'] = update_campaign_request.status
        
        # Update campaign
        success = campaign_manager.update_campaign(user_email, campaign_id, updates)
        
        if not success:
            # Check if it's a duplicate name error
            if 'campaign_name' in updates and campaign_manager._check_campaign_name_exists(user_email, updates['campaign_name'], exclude_campaign_id=campaign_id):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Campaign name '{updates['campaign_name']}' already exists. Please choose a different name."
                )
            else:
                raise HTTPException(status_code=404, detail="Campaign not found or failed to update")
        
        print(f"✅ Updated campaign: {campaign_id} for {user_email}")
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "message": "Campaign updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update campaign: {str(e)}")

@app.delete("/api/campaigns/{campaign_id}", response_model=DeleteCampaignResponse)
async def delete_campaign(campaign_id: str, request: Request):
    """Delete a campaign"""
    try:
        print(f"\n🗑️ API REQUEST: DELETE_CAMPAIGN")
        
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"📝 API Parameters: user_email={user_email}, campaign_id={campaign_id}")
        
        # Delete campaign
        success = campaign_manager.delete_campaign(user_email, campaign_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or failed to delete")
        
        print(f"✅ Deleted campaign: {campaign_id} for {user_email}")
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "message": "Campaign deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete campaign: {str(e)}")

@app.post("/api/campaigns/{campaign_id}/start", response_model=UpdateCampaignResponse)
async def start_campaign(campaign_id: str, request: Request):
    """Start a campaign (change status from draft to active)"""
    try:
        print(f"\n▶️ API REQUEST: START_CAMPAIGN")
        
        # Get session_id from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID provided. Please authenticate first.")
        
        # Get user info from token file or Redis
        user_info = None
        token_file = user_manager.get_user_token_file(session_id)
        
        if token_file:
            user_info = user_manager.get_user_info_from_token_file(token_file)
        
        if not user_info:
            # Check Redis for session data
            auth_data = RedisManager.get_session_data(session_id)
            if auth_data:
                user_info = auth_data
            else:
                raise HTTPException(status_code=401, detail="No valid session found. Please authenticate first.")
        
        user_email = user_info.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in session data")
        
        print(f"📝 API Parameters: user_email={user_email}, campaign_id={campaign_id}")
        
        # Start campaign
        success = campaign_manager.start_campaign(user_email, campaign_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or failed to start")
        
        print(f"✅ Started campaign: {campaign_id} for {user_email}")
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "message": "Campaign started successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error starting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start campaign: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)