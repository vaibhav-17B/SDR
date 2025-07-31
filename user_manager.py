import os
import json
import glob
import base64
from email.mime.text import MIMEText
from typing import Optional

TOKENS_FOLDER = 'tokens'


class UserManager:
    def __init__(self, tokens_folder: Optional[str] = None, redis_client=None):
        self.tokens_folder = tokens_folder or TOKENS_FOLDER
        self.redis_client = redis_client

    def get_user_token_file(self, session_id: Optional[str] = None) -> Optional[str]:
        for file in os.listdir(self.tokens_folder):
            if session_id and file.startswith(f"{session_id}"):
                return os.path.join(self.tokens_folder, file)
        return None

    def get_user_info_from_token_file(self, token_file_path: str) -> Optional[dict]:
        """Extract user info from the given token file"""
        try:
            with open(token_file_path, 'r') as f:
                user_data = json.load(f)

            required_fields = ['name', 'email', 'company_name', 'designation', 'experience', 'credentials']
            profile_complete = all(
                field in user_data and
                (user_data[field] not in [None, "", 0] or field == "experience")
                for field in required_fields
            )

            return {
                "name": user_data.get('name', 'Unknown'),
                "email": user_data.get('email', 'Unknown'),
                "company_name": user_data.get('company_name'),
                "designation": user_data.get('designation'),
                "experience": user_data.get('experience'),
                "profile_complete": profile_complete,
                "credentials": user_data.get('credentials')
            }

        except Exception as e:
            print(f"❌ Error reading token file: {str(e)}")
            return None

    def get_user_info_from_session(self, session_id: str) -> Optional[dict]:
        """Get user info from Redis using session_id"""
        if not self.redis_client:
            print("⚠️ Redis client not initialized in UserManager")
            return None

        auth_data = self.redis_client.get_session_data(session_id)
        if auth_data:
            return {
                "name": auth_data.get('name', 'Unknown'),
                "email": auth_data.get('email', 'Unknown'),
                "company_name": None,
                "designation": None,
                "experience": None,
                "profile_complete": False,
                "credentials": auth_data.get('credentials'),
                "session_id": session_id
            }
        return None

    def get_current_user_info(self, session_id: Optional[str] = None) -> Optional[dict]:
        """Return the most complete user info available from file or session"""
        token_file = self.get_user_token_file()
        if token_file:
            user_info = self.get_user_info_from_token_file(token_file)
            if user_info and user_info.get('profile_complete'):
                return user_info

        if session_id:
            return self.get_user_info_from_session(session_id)

        return None

    def get_domain_from_email(self, email: str) -> str:
        """Extract and normalize domain from email"""
        try:
            return email.split('@')[1].replace('.', '_')
        except Exception:
            return "unknown_domain"

    def create_message(self, sender: str, to: str, subject: str, message_text: str) -> dict:
        """Create a MIME message for sending through Gmail API"""
        message = MIMEText(message_text)
        message['to'] = to
        message['from'] = sender
        message['subject'] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return {'raw': raw}