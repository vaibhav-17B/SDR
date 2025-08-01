import os
import json
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv
from openai import AzureOpenAI
from pydantic import model_validator

# Load environment variables
load_dotenv()

AZURE_OPENAI_ENDPOINT = "https://azureml-dataengineering-aoaiv2.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT = "gpt-4"
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_API_VERSION = "2025-01-01-preview"

if not AZURE_OPENAI_KEY:
    raise RuntimeError("AZURE_OPENAI_KEY not set in .env")

client = AzureOpenAI(
    api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=AZURE_OPENAI_KEY,
)

# ---------- Utility to Clean JSON Markup ----------

def extract_json_string(text: str) -> str:
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()

# ---------- Pydantic Models ----------

class EmailContent(BaseModel):
    subject: str
    body: str

class FollowUpEmails(BaseModel):
    count: int = Field(..., ge=1, le=3)
    follow_up_1: Optional[EmailContent] = None
    follow_up_2: Optional[EmailContent] = None
    follow_up_3: Optional[EmailContent] = None

    @model_validator(mode="after")
    def validate_followups(self):
        provided = {
            1: self.follow_up_1,
            2: self.follow_up_2,
            3: self.follow_up_3
        }

        for i in range(1, 4):
            email = provided[i]
            if i <= self.count and email is None:
                raise ValueError(f"follow_up_{i} is required when count is {self.count}")
            if i > self.count and email is not None:
                raise ValueError(f"follow_up_{i} must not be provided when count is {self.count}")

        return self

class EmailSequence(BaseModel):
    initial_email: EmailContent
    follow_up: FollowUpEmails
    reply_interested: Optional[EmailContent]
    reply_not_interested: Optional[EmailContent]
    reply_meeting_requested: Optional[EmailContent]

class StyleRequest(BaseModel):
    style_name: str
    description: str
    follow_up_count: int

# ---------- Azure Chat Wrapper ----------

def get_chat_response(messages: list[dict]) -> str:
    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
        top_p=1.0,
    )
    return response.choices[0].message.content

# ---------- Email Generators ----------

async def generate_initial_email(style: str, description: str) -> EmailContent:
    messages = [
        {"role": "system", "content": "You are a helpful assistant that writes professional cold outreach emails."},
        {"role": "user", "content": f"Write ONLY the subject and body in JSON format for the initial outreach email in a {style} style. The topic is: {description}.\n\nFormat:\n{{\"subject\": \"...\", \"body\": \"...\"}}"}
    ]
    raw_response = get_chat_response(messages)
    json_string = extract_json_string(raw_response)
    return EmailContent.model_validate_json(json_string)

async def generate_follow_ups(style: str, description: str, count: int, initial_email: EmailContent) -> FollowUpEmails:
    if not (1 <= count <= 3):
        raise ValueError("Follow-up count must be between 1 and 3.")

    follow_ups = {}
    previous_email = initial_email

    for i in range(1, count + 1):
        messages = [
            {"role": "system", "content": "You are a helpful assistant that writes follow-up emails for cold outreach."},
            {"role": "user", "content": (
                f"Write follow-up email #{i} in JSON format. Use the following as context:\n"
                f"- Previous email subject: {previous_email.subject}\n"
                f"- Previous email body: {previous_email.body}\n\n"
                f"Style: {style}\n"
                f"Topic: {description}\n"
                f"Respond in JSON format: {{\"subject\": \"...\", \"body\": \"...\"}}"
            )}
        ]

        try:
            response = get_chat_response(messages)
            json_string = extract_json_string(response)
            email = EmailContent.model_validate_json(json_string)
            follow_ups[f"follow_up_{i}"] = email
            previous_email = email
        except Exception as e:
            print(f"[DEBUG] Failed generating follow-up #{i}: {e}")
            raise ValueError(f"Failed to generate follow-up email #{i}: {e}")

    return FollowUpEmails(count=count, **follow_ups)

async def generate_reply(style: str, description: str, reply_type: str) -> EmailContent:
    prompt_map = {
        "interested": "Write a reply email if the recipient is interested.",
        "not_interested": "Write a polite response if the recipient is not interested.",
        "meeting_requested": "Write a reply if the recipient asks for a meeting."
    }
    if reply_type not in prompt_map:
        raise ValueError("Invalid reply_type")

    messages = [
        {"role": "system", "content": "You are an AI assistant that helps write professional email responses."},
        {"role": "user", "content": f"{prompt_map[reply_type]} Include subject and body in JSON format. Style: {style}. Topic: {description}.\n\nFormat:\n{{\"subject\": \"...\", \"body\": \"...\"}}"}
    ]
    raw_response = get_chat_response(messages)
    json_string = extract_json_string(raw_response)
    return EmailContent.model_validate_json(json_string)

# ---------- Sequence Orchestrator ----------

async def build_email_sequence(style: str, description: str, follow_up_count: int = 2) -> EmailSequence:
    initial = await generate_initial_email(style, description)
    follow_ups = await generate_follow_ups(style, description, follow_up_count, initial)
    reply_yes = await generate_reply(style, description, "interested")
    reply_no = await generate_reply(style, description, "not_interested")
    reply_meeting = await generate_reply(style, description, "meeting_requested")

    return EmailSequence(
        initial_email=initial,
        follow_up=follow_ups,
        reply_interested=reply_yes,
        reply_not_interested=reply_no,
        reply_meeting_requested=reply_meeting
    )

# ---------- FastAPI Setup ----------

app = FastAPI()

@app.post("/generate_email_sequence", response_model=EmailSequence)
async def generate_email_sequence(input: StyleRequest):
    try:
        return await build_email_sequence(input.style_name, input.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
