
from base_models import UserData, EmailGenerationParams, EmailSendRequest, LeadSearchRequest
from fastapi.responses import HTMLResponse
import json
from apscheduler.triggers.cron import CronTrigger
import pytz
from email.mime.text import MIMEText
import base64
from datetime import datetime


def build_auth_html_response(
    title: str,
    heading: str,
    message: str,
    post_message_type: str,
    success: bool,
    additional_js: str = "",
    data: dict = None,
    auto_close_ms: int = 5000
):
    """Generate a modular HTML response for auth callback"""
    data_js = ",\n".join([f"{k}: {json.dumps(v)}" for k, v in (data or {}).items()])
    
    html = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <title>{title}</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h2>{heading}</h2>
            <p>{message}</p>
            <script>
                let messagesSent = 0;
                const maxRetries = 5;
                
                function sendMessage() {{
                    try {{
                        if (window.opener && !window.opener.closed) {{
                            window.opener.postMessage({{
                                type: '{post_message_type}',
                                success: {str(success).lower()},
                                {data_js}
                            }}, '*');
                            messagesSent++;
                            console.log('Message sent, attempt:', messagesSent);
                        }}
                    }} catch (e) {{
                        console.error('Could not communicate with parent window:', e);
                    }}
                }}
                
                // Send message immediately and retry
                sendMessage();
                const retryInterval = setInterval(() => {{
                    if (messagesSent < maxRetries) {{
                        sendMessage();
                    }} else {{
                        clearInterval(retryInterval);
                    }}
                }}, 500);

                {additional_js}

                setTimeout(() => {{
                    clearInterval(retryInterval);
                    try {{
                        window.close();
                    }} catch (e) {{
                        console.error('Could not close window:', e);
                        window.location.href = 'about:blank';
                    }}
                }}, {auto_close_ms});
            </script>
        </body>
    </html>
    """
    
    return HTMLResponse(html, headers={
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Embedder-Policy": "unsafe-none"
    })


class email_helper():
    def __init__(self):
        None
        
    def send_email_now(self,email_request: EmailSendRequest,creds,user_info:dict,service):
        # Build Gmail service
            
            # Prepare results tracking
            successful_sends = []
            failed_sends = []
            
            # Set sender email
            sender_email = user_info['email'] if email_request.sender == "me" or not email_request.sender else email_request.sender
            
            # Send email to each recipient
            for recipient in email_request.to:
                try:
                    # Create email message for each recipient
                    message = MIMEText(email_request.body, 'html' if '<' in email_request.body else 'plain')
                    message['to'] = recipient
                    message['subject'] = email_request.subject
                    message['from'] = sender_email
                    
                    # Add CC and BCC if provided
                    if email_request.cc:
                        message['cc'] = ', '.join(email_request.cc)
                    if email_request.bcc:
                        message['bcc'] = ', '.join(email_request.bcc)
                    
                    # Encode message
                    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
                    
                    # Send email
                    send_result = service.users().messages().send(
                        userId='me',
                        body={'raw': raw_message}
                    ).execute()
                    
                    successful_sends.append({
                        "to": recipient,
                        "message_id": send_result.get('id'),
                        "status": "sent"
                    })
                    
                    print(f"✅ Email sent to {recipient} - Message ID: {send_result.get('id')}")
                    
                except Exception as e:
                    failed_sends.append({
                        "to": recipient,
                        "status": "failed",
                        "error": str(e)
                    })
                    print(f"❌ Failed to send email to {recipient}: {str(e)}")
            
            # Return comprehensive results
            return {
                "success": True,
                "message": f"Email processing completed. {len(successful_sends)} sent, {len(failed_sends)} failed.",
                "total_recipients": len(email_request.to),
                "successful_sends": len(successful_sends),
                "failed_sends": len(failed_sends),
                "subject": email_request.subject,
                "sender": sender_email,
                "timestamp": datetime.now().isoformat(),
                "results": {
                    "successful": successful_sends,
                    "failed": failed_sends
                }
            }
            

    def schedule_email_job(self,email_request, credentials, user_data,service, scheduler):
        """Schedules the email job using APScheduler if interval is specified."""
        interval = email_request.interval
        time_str = email_request.time  # e.g. "09:00"
        timezone_str = email_request.timezone or "UTC"
        hour, minute = map(int, time_str.split(":"))

        day_names = interval.get("days", [])
        cron_days = [str.lower(d[:3]) for d in day_names]
        print(f"\ncron_days_Recieved: {cron_days}\n")

        job_id = f"send_mail_{user_data['email']}_{datetime.now().timestamp()}"

        trigger = CronTrigger(
            day_of_week=','.join(cron_days),
            hour=hour,
            minute=minute,
            timezone=pytz.timezone(timezone_str)
        )

        scheduler.add_job(
            self.send_email_now,
            trigger,
            args=[email_request, credentials, user_data,service],
            id=job_id,
            replace_existing=False
        )
        print(f"⏰ Email job scheduled with ID: {job_id}")


BASE_PROMPT="""
You are an expert Sales Development Representative (SDR) email writing assistant. Your task is to craft personalized, compelling sales emails that generate positive responses and build meaningful connections with prospects.

OUTPUT_FORMAT

Return your response as a JSON object with exactly this structure:
```json
{
  "subject": "Your email subject line here",
  "body": "Your complete email body here"
}
```

PERSONALIZATION_REQUIREMENTS

 Reference specific details from lead profile (current company, role, previous experience, location)
 Connect pain points to their industry, company size, or management level
 Mention relevant skills or expertise from their background
 Use insights from their work history to build credibility
 Use at least 2-3 specific details from lead profile naturally
 Avoid over-personalization that feels invasive or researchy

SUBJECT_LINE_GUIDELINES

 Keep it under 50 characters for mobile optimization
 Make it specific and relevant to the prospect's role/industry
 Avoid spam trigger words (FREE, URGENT, !!!, etc.)
 Personalize with company name, role, or relevant detail when appropriate
 Create curiosity without being misleading

BODY_STRUCTURE

 Opening: Personalized greeting using prospect's first name
 Hook: Relevant connection point (mutual connection, company news, industry insight, or personalized observation)
 Value Proposition: Clear, concise benefit statement tied to their pain points and the description provided by the user
 Social Proof: Brief credibility indicator (client success, company credentials, relevant metrics)
 Call-to-Action: Single, specific, low-commitment next step
 Professional Closing: Appropriate sign-off with sender information

TONE_ADAPTATION

 Professional: Formal language, industry terminology, structured approach
 Casual: Conversational style, shorter sentences, friendly approach
 Consultative: Advisory tone, problem-solving focus, educational content
 Urgent: Time-sensitive language while maintaining professionalism
 Friendly: Warm, approachable, relationship-focused communication

CONSTRAINTS_GUARDRAILS

 Never make false claims about company size, client base, or capabilities
 Avoid overly promotional or pushy language
 Don't use generic templates that ignore provided personalization data
 Never promise unrealistic outcomes or guarantees
 Avoid industry jargon that may not be universally understood
 Include clear sender identification
 Respect CAN-SPAM guidelines
 Maintain professional standards regardless of tone
 Ensure all personalization elements are accurate and relevant
 Check for grammar, spelling, and formatting errors

"""