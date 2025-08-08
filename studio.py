import os
import json
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from dotenv import load_dotenv
from openai import AzureOpenAI
from utils import BASE_PROMPT
from base_models import EmailContent, RefineEmailRequest



# Load environment variables
load_dotenv()

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")

if not AZURE_OPENAI_KEY:
    raise RuntimeError("AZURE_OPENAI_KEY not set in .env")

client = AzureOpenAI(
    api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=AZURE_OPENAI_KEY,
)



    
# ---------- Dynamic Email Generator ----------

async def generate_multiple_emails(mail_types: List[str], tone: str, description: str, additional_requirements: str = "") -> Dict[str, EmailContent]:
    """
    Dynamically generate multiple emails based on the mail_types list from frontend
    Returns a dictionary where keys are mail_types and values are email content
    """
    
    # Create dynamic JSON schema based on requested mail types
    email_properties = {}
    required_fields = []
    
    for mail_type in mail_types:
        email_properties[mail_type] = {
            "type": "object",
            "properties": {
                "subject": {"type": "string"},
                "body": {"type": "string"}
            },
            "required": ["subject", "body"],
            "additionalProperties": False
        }
        required_fields.append(mail_type)
    
    # Build comprehensive system prompt
    system_prompt = BASE_PROMPT + f"""
    
Email Type Guidelines:
- initial_email: Professional introduction email to start a conversation with a potential client
- follow_up_1: First follow-up email for non-responders, adding value and being helpful
- follow_up_2: Second follow-up with a different angle, perhaps sharing case studies or testimonials  
- follow_up_3: Final follow-up with gentle urgency while remaining professional
- reply_interested: Response when someone shows interest in your outreach
- reply_not_interested: Polite response when someone declines, leaving the door open
- reply_meeting_requested: Response when someone requests a meeting or demo

Write professional, compelling emails that get responses while maintaining authenticity."""

    # Build user prompt
    user_prompt = f"""Generate {len(mail_types)} professional emails with the following specifications:

Email Types Requested: {', '.join(mail_types)}
Tone: {tone}
Description/Context: {description}
Additional Requirements: {additional_requirements}

For each email type, provide:
1. An compelling subject line
2. A professional email body that matches the type and tone

IMPORTANT: Return the response in JSON format where the keys are EXACTLY the email type names I provided: {mail_types}
Do NOT change the key names. Use the exact strings: {', '.join(mail_types)}

Example format:
{{
    "{mail_types[0] if mail_types else 'initial_email'}": {{"subject": "...", "body": "..."}},
    "{mail_types[1] if len(mail_types) > 1 else 'follow_up_1'}": {{"subject": "...", "body": "..."}}
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=8000,
            temperature=0.7,
            top_p=1.0,
            model=AZURE_OPENAI_DEPLOYMENT,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "MultipleEmailResponse",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": email_properties,
                        "required": required_fields,
                        "additionalProperties": False
                    }
                }
            },
        )

        content = response.choices[0].message.content
        print(f"[DEBUG] LLM Response: {content}")
        
        try:
            raw_result = json.loads(content)
            print(f"[DEBUG] Raw LLM result keys: {list(raw_result.keys())}")
            print(f"[DEBUG] Expected mail_types: {mail_types}")
            
            # Convert dict responses to EmailContent objects
            result = {}
            
            # Convert dict responses to EmailContent objects
            for mail_type in mail_types:
                if mail_type in raw_result and isinstance(raw_result[mail_type], dict):
                    email_data = raw_result[mail_type]
                    if "subject" in email_data and "body" in email_data:
                        result[mail_type] = EmailContent(
                            subject=email_data["subject"],
                            body=email_data["body"]
                        )
                        print(f"[DEBUG] Successfully processed {mail_type}")
                    else:
                        print(f"[WARNING] Invalid email data for {mail_type}, creating fallback")
                        result[mail_type] = EmailContent(
                            subject=f"{mail_type.replace('_', ' ').title()} - {tone.capitalize()} Email",
                            body=f"This is a {tone} {mail_type.replace('_', ' ')} email based on: {description}"
                        )
                else:
                    print(f"[WARNING] No valid data found for {mail_type}, creating fallback")
                    result[mail_type] = EmailContent(
                        subject=f"{mail_type.replace('_', ' ').title()} - {tone.capitalize()} Email",
                        body=f"This is a {tone} {mail_type.replace('_', ' ')} email based on: {description}"
                    )
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON decode error: {e}")
            print(f"[ERROR] Raw content: {content}")
            # Fallback: create basic emails for each type
            fallback_result = {}
            for mail_type in mail_types:
                fallback_result[mail_type] = EmailContent(
                    subject=f"{mail_type.replace('_', ' ').title()} - {tone.capitalize()} Email",
                    body=f"This is a {tone} {mail_type.replace('_', ' ')} email based on: {description}"
                )
            return fallback_result

    except Exception as e:
        print(f"[ERROR] Email generation failed: {str(e)}")
        # Fallback: create error emails for each type
        error_result = {}
        for mail_type in mail_types:
            error_result[mail_type] = EmailContent(
                subject=f"Error generating {mail_type}",
                body=f"Failed to generate {mail_type}: {str(e)}"
            )
        return error_result


async def refine_email_content(request: RefineEmailRequest) -> EmailContent:
    """
    Refine the generated email content based on user instructions
    """
    
    system_prompt = """You are an Expert Mail Composer that helps users to refine and polish their emails based on their description and requirements. Your task is to refine the email content based on the provided instructions. Maintain the original message intent, but enhance clarity, professionalism, and engagement based on the refinement instructions."""
    
    user_prompt = f"""
    Refine the following email content based on the provided instructions:
    
    Original Subject: {request.original_subject}
    Original Body: {request.original_body}
    Mail Type: {request.mail_type or 'Not specified'}
    Tone: {request.tone or 'Professional'}
    Refinement Instructions: {request.refinement_instructions}

    Please provide a refined version that:
    1. Maintains the original intent and message
    2. Incorporates the refinement instructions
    3. Ensures clarity, professionalism, and engagement
    4. Matches the specified tone if provided
    
    Return the response in JSON format with "subject" and "body" fields.
    """

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=4000,
            temperature=0.7,
            top_p=1.0,
            model=AZURE_OPENAI_DEPLOYMENT,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "RefinedEmailResponse",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "subject": {"type": "string"},
                            "body": {"type": "string"}
                        },
                        "required": ["subject", "body"],
                        "additionalProperties": False
                    }
                }
            },
        )

        content = response.choices[0].message.content
        print(f"[DEBUG] Email Refinement LLM Response: {content}")
        
        try:
            refined_result = json.loads(content)
            return EmailContent(
                subject=refined_result["subject"],
                body=refined_result["body"]
            )
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON decode error in refinement: {e}")
            # Fallback: return original content with note
            return EmailContent(
                subject=f"[Refined] {request.original_subject}",
                body=f"{request.original_body}\n\n[Note: Refinement processing encountered an error, showing original content]"
            )

    except Exception as e:
        print(f"[ERROR] Email refinement failed: {str(e)}")
        # Fallback: return original content with error note
        return EmailContent(
            subject=f"[Error in Refinement] {request.original_subject}",
            body=f"{request.original_body}\n\n[Error: Failed to refine email - {str(e)}]"
        )

