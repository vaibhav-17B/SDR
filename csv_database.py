import csv
import os
import pandas as pd
from datetime import datetime
from typing import Optional, Dict, Any
import re

class CSVUserDatabase:
    def __init__(self, csv_file_path: str = "user_database.csv"):
        self.csv_file_path = csv_file_path
        self.headers = [
            'first_name', 'last_name', 'email', 'domain', 
            'work_experience', 'designation', 'company_name',
            'last_session_id', 'total_sessions', 'deleted',
            'deleted_count', 'profile_updation_count', 
            'created_at', 'last_updated', 'last_login'
        ]
        self._ensure_csv_exists()
    
    def _ensure_csv_exists(self):
        """Create CSV file with headers if it doesn't exist"""
        if not os.path.exists(self.csv_file_path):
            with open(self.csv_file_path, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.headers)
                writer.writeheader()
            print(f"✅ Created CSV database: {self.csv_file_path}")
    
    def _get_domain_from_email(self, email: str) -> str:
        """Extract domain from email"""
        try:
            return email.split('@')[1].lower()
        except:
            return "unknown"
    
    def _parse_name(self, full_name: str) -> tuple:
        """Parse full name into first and last name"""
        try:
            parts = full_name.strip().split()
            if len(parts) >= 2:
                first_name = parts[0]
                last_name = ' '.join(parts[1:])
            else:
                first_name = parts[0] if parts else "Unknown"
                last_name = ""
            return first_name, last_name
        except:
            return "Unknown", ""
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user record by email"""
        try:
            if not os.path.exists(self.csv_file_path):
                return None
                
            df = pd.read_csv(self.csv_file_path)
            user_rows = df[df['email'].str.lower() == email.lower()]
            
            if not user_rows.empty:
                user_dict = user_rows.iloc[0].to_dict()
                # Convert NaN values to empty strings for consistency
                for key, value in user_dict.items():
                    if pd.isna(value):
                        user_dict[key] = ""
                    elif isinstance(value, (int, float)) and pd.isna(value):
                        user_dict[key] = ""
                    else:
                        user_dict[key] = str(value).strip()
                print(f"DEBUG CSV: Retrieved user data for {email}: {user_dict}")
                return user_dict
            return None
        except Exception as e:
            print(f"Error reading user from CSV: {e}")
            return None
    
    def user_exists(self, email: str) -> bool:
        """Check if user exists in database"""
        return self.get_user_by_email(email) is not None
    
    def is_user_deleted(self, email: str) -> bool:
        """Check if user is marked as deleted"""
        user = self.get_user_by_email(email)
        if user:
            # Handle both string and boolean values for deleted field
            deleted_value = str(user.get('deleted', 'False')).lower()
            print(f"**DEBUG CSV**: User with email:{email} is have progile this{user} and deleted_value is:{deleted_value}")

            print(f"**DEBUG CSV**: User with email:{email} is {'deleted' if deleted_value in ['true', '1', 'yes'] else 'not deleted'}")
            return deleted_value in ['true', '1', 'yes']
        return False
    
    def add_or_update_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add new user or update existing user"""
        try:
            email = user_data.get('email', '').lower()
            existing_user = self.get_user_by_email(email)
            
            # Parse name
            full_name = user_data.get('name', user_data.get('full_name', ''))
            first_name, last_name = self._parse_name(full_name)
            
            current_time = datetime.now().isoformat()
            
            if existing_user:
                # Update existing user
                result = self._update_existing_user(existing_user, user_data, current_time)
            else:
                # Add new user
                result = self._add_new_user(user_data, first_name, last_name, current_time)
            
            print(f"✅ User {'updated' if existing_user else 'added'}: {email}")
            return result
            
        except Exception as e:
            print(f"❌ Error adding/updating user: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_existing_user(self, existing_user: Dict, user_data: Dict, current_time: str) -> Dict[str, Any]:
        """Update existing user record"""
        try:
            df = pd.read_csv(self.csv_file_path)
            email = user_data.get('email', '').lower()
            
            # Find the user row
            user_index = df[df['email'].str.lower() == email].index[0]
            
            # Parse name
            full_name = user_data.get('name', user_data.get('full_name', ''))
            first_name, last_name = self._parse_name(full_name)
            
            # Update fields
            df.at[user_index, 'first_name'] = first_name
            df.at[user_index, 'last_name'] = last_name
            df.at[user_index, 'work_experience'] = user_data.get('experience', existing_user.get('work_experience', ''))
            df.at[user_index, 'designation'] = user_data.get('designation', existing_user.get('designation', ''))
            df.at[user_index, 'company_name'] = user_data.get('company_name', existing_user.get('company_name', ''))
            df.at[user_index, 'last_session_id'] = user_data.get('session_id', existing_user.get('last_session_id', ''))
            df.at[user_index, 'last_updated'] = current_time
            df.at[user_index, 'last_login'] = current_time
            
            # Increment session count if new session
            if user_data.get('session_id') != existing_user.get('last_session_id'):
                current_sessions = int(existing_user.get('total_sessions', 0))
                df.at[user_index, 'total_sessions'] = current_sessions + 1
            
            # If user was deleted and is re-registering, reset deleted status
            if self.is_user_deleted(email) and user_data.get('profile_complete', False):
                df.at[user_index, 'deleted'] = False
                print(f"🔄 User {email} re-registered after deletion")
            
            # Save back to CSV
            df.to_csv(self.csv_file_path, index=False)
            
            return {
                "success": True,
                "action": "updated",
                "user_existed": True,
                "was_deleted": self.is_user_deleted(email),
                "total_sessions": int(df.at[user_index, 'total_sessions'])
            }
            
        except Exception as e:
            print(f"❌ Error updating existing user: {e}")
            return {"success": False, "error": str(e)}
    
    def _add_new_user(self, user_data: Dict, first_name: str, last_name: str, current_time: str) -> Dict[str, Any]:
        """Add new user record"""
        try:
            email = user_data.get('email', '').lower()
            domain = self._get_domain_from_email(email)
            
            new_user = {
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'domain': domain,
                'work_experience': user_data.get('experience', ''),
                'designation': user_data.get('designation', ''),
                'company_name': user_data.get('company_name', ''),
                'last_session_id': user_data.get('session_id', ''),
                'total_sessions': 1,
                'deleted': False,
                'deleted_count': 0,
                'profile_updation_count': 0,
                'created_at': current_time,
                'last_updated': current_time,
                'last_login': current_time
            }
            
            # Append to CSV
            with open(self.csv_file_path, 'a', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.headers)
                writer.writerow(new_user)
            
            return {
                "success": True,
                "action": "created",
                "user_existed": False,
                "was_deleted": False,
                "total_sessions": 1
            }
            
        except Exception as e:
            print(f"❌ Error adding new user: {e}")
            return {"success": False, "error": str(e)}
    
    def update_user_profile(self, email: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile information"""
        try:
            if not self.user_exists(email):
                return {"success": False, "error": "User not found"}
            
            df = pd.read_csv(self.csv_file_path)
            user_index = df[df['email'].str.lower() == email.lower()].index[0]
            
            # Update profile fields
            if 'company_name' in profile_data:
                df.at[user_index, 'company_name'] = profile_data['company_name']
            if 'designation' in profile_data:
                df.at[user_index, 'designation'] = profile_data['designation']
            if 'experience' in profile_data:
                df.at[user_index, 'work_experience'] = profile_data['experience']
            
            # Increment profile update count
            current_count = int(df.at[user_index, 'profile_updation_count'])
            df.at[user_index, 'profile_updation_count'] = current_count + 1
            df.at[user_index, 'last_updated'] = datetime.now().isoformat()
            
            # Save back to CSV
            df.to_csv(self.csv_file_path, index=False)
            
            return {
                "success": True,
                "message": "Profile updated successfully",
                "profile_updates": current_count + 1
            }
            
        except Exception as e:
            print(f"❌ Error updating user profile: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_user_profile(self, email: str) -> Dict[str, Any]:
        """Mark user as deleted"""
        try:
            if not self.user_exists(email):
                return {"success": False, "error": "User not found"}
            
            df = pd.read_csv(self.csv_file_path)
            user_index = df[df['email'].str.lower() == email.lower()].index[0]
            
            # Mark as deleted and increment delete count
            df.at[user_index, 'deleted'] = True
            current_delete_count = int(df.at[user_index, 'deleted_count'])
            df.at[user_index, 'deleted_count'] = current_delete_count + 1
            df.at[user_index, 'last_updated'] = datetime.now().isoformat()
            
            # Save back to CSV
            df.to_csv(self.csv_file_path, index=False)
            
            return {
                "success": True,
                "message": "Profile deleted successfully",
                "delete_count": current_delete_count + 1
            }
            
        except Exception as e:
            print(f"❌ Error deleting user profile: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_stats(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user statistics"""
        user = self.get_user_by_email(email)
        if user:
            return {
                "total_sessions": int(user.get('total_sessions', 0)),
                "profile_updates": int(user.get('profile_updation_count', 0)),
                "delete_count": int(user.get('deleted_count', 0)),
                "created_at": user.get('created_at', ''),
                "last_login": user.get('last_login', ''),
                "is_deleted": self.is_user_deleted(email)
            }
        return None
    
    def update_last_login(self, email: str, session_id: str):
        """Update user's last login and session info"""
        try:
            if not self.user_exists(email):
                return
            
            df = pd.read_csv(self.csv_file_path)
            user_index = df[df['email'].str.lower() == email.lower()].index[0]
            
            # Update last login and session
            df.at[user_index, 'last_login'] = datetime.now().isoformat()
            df.at[user_index, 'last_session_id'] = session_id
            
            # Save back to CSV
            df.to_csv(self.csv_file_path, index=False)
            
        except Exception as e:
            print(f"❌ Error updating last login: {e}")