import os
import json
import csv
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any

class CampaignManager:
    def __init__(self, base_folder: str = "user_campaigns"):
        self.base_folder = base_folder
        os.makedirs(base_folder, exist_ok=True)
        
    def _get_user_folder(self, user_email: str) -> str:
        """Create user-specific folder based on email"""
        safe_email = user_email.replace('@', '_at_').replace('.', '_')
        user_folder = os.path.join(self.base_folder, safe_email)
        os.makedirs(user_folder, exist_ok=True)
        return user_folder
        
    def _get_csv_file_path(self, user_email: str) -> str:
        """Get path to user's campaigns CSV file"""
        user_folder = self._get_user_folder(user_email)
        return os.path.join(user_folder, "campaigns.csv")
        
    def _ensure_csv_exists(self, csv_path: str):
        """Create CSV file with headers if it doesn't exist"""
        if not os.path.exists(csv_path):
            headers = [
                'campaign_id', 'campaign_name', 'description', 'created_date', 'created_time',
                'date_started', 'date_last_modified', 'status', 'channels', 'mail_styles',
                'prospects_list_id', 'prospects_count', 'campaign_json_path'
            ]
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                
    def _check_campaign_name_exists(self, user_email: str, campaign_name: str, exclude_campaign_id: str = None) -> bool:
        """Check if a campaign name already exists for a user (excluding specific campaign ID)"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            df = pd.read_csv(csv_path)
            
            # Filter by campaign name
            existing_campaigns = df[df['campaign_name'].str.lower() == campaign_name.lower()]
            
            # If excluding a specific campaign ID (for updates), filter it out
            if exclude_campaign_id:
                existing_campaigns = existing_campaigns[existing_campaigns['campaign_id'] != exclude_campaign_id]
            
            return len(existing_campaigns) > 0
            
        except Exception as e:
            print(f"⚠️ Error checking campaign name: {str(e)}")
            return False

    def create_campaign(self, user_email: str, campaign_name: str, description: str = "", 
                       channels: List[Dict] = None, mail_styles: List[Dict] = None,
                       prospects_list_id: str = None, prospects_count: int = 0) -> str:
        """Create a new campaign for a user"""
        try:
            # Check if campaign name already exists
            if self._check_campaign_name_exists(user_email, campaign_name):
                print(f"❌ Campaign name '{campaign_name}' already exists for {user_email}")
                return None
            
            user_folder = self._get_user_folder(user_email)
            csv_path = self._get_csv_file_path(user_email)
            self._ensure_csv_exists(csv_path)
            
            # Generate unique campaign ID
            timestamp = datetime.now()
            campaign_id = f"campaign_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            
            # Default channel IDs mapping
            default_channels = [
                {"channel_id": 1, "name": "Email", "enabled": True},
                {"channel_id": 2, "name": "LinkedIn", "enabled": False}
            ]
            
            # Use provided channels or defaults
            campaign_channels = channels if channels else default_channels
            
            # Save campaign data to JSON file
            json_filename = f"{campaign_id}_{campaign_name.replace(' ', '_').replace('/', '_')}.json"
            json_path = os.path.join(user_folder, json_filename)
            
            campaign_data = {
                'campaign_id': campaign_id,
                'campaign_name': campaign_name,
                'description': description,
                'created_timestamp': timestamp.isoformat(),
                'date_started': None,
                'date_last_modified': timestamp.isoformat(),
                'status': 'draft',
                'channels': campaign_channels,
                'mail_styles': mail_styles or [],
                'prospects_list_id': prospects_list_id,
                'prospects_count': prospects_count,
                'campaign_settings': {},
                'analytics': {
                    'emails_sent': 0,
                    'emails_opened': 0,
                    'emails_replied': 0,
                    'linkedin_messages_sent': 0,
                    'linkedin_connections': 0
                }
            }
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(campaign_data, f, indent=2, ensure_ascii=False)
            
            # Prepare CSV row data
            csv_row = [
                campaign_id,
                campaign_name,
                description,
                timestamp.strftime('%Y-%m-%d'),
                timestamp.strftime('%H:%M:%S'),
                '',  # date_started (empty for draft)
                timestamp.isoformat(),
                'draft',
                json.dumps(campaign_channels),
                json.dumps(mail_styles or []),
                prospects_list_id or '',
                prospects_count,  # actual prospects count
                json_path
            ]
            
            # Append to CSV
            with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(csv_row)
            
            print(f"✅ Campaign created for {user_email}: {campaign_name} ({campaign_id})")
            return campaign_id
            
        except Exception as e:
            print(f"❌ Error creating campaign for {user_email}: {str(e)}")
            return None
            
    def get_user_campaigns(self, user_email: str) -> List[Dict]:
        """Get user's campaigns (most recent first)"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return []
            
            # Read CSV and convert to list of dicts
            df = pd.read_csv(csv_path)
            
            # Sort by created_date and created_time (most recent first)
            df['datetime'] = pd.to_datetime(df['created_date'] + ' ' + df['created_time'])
            df = df.sort_values('datetime', ascending=False)
            
            campaigns = []
            for _, row in df.iterrows():
                # Load JSON campaign data if file exists
                campaign_data = {}
                if pd.notna(row['campaign_json_path']) and os.path.exists(row['campaign_json_path']):
                    try:
                        with open(row['campaign_json_path'], 'r', encoding='utf-8') as f:
                            campaign_data = json.load(f)
                    except Exception as e:
                        print(f"⚠️ Warning: Could not load campaign file {row['campaign_json_path']}: {e}")
                
                # Parse JSON fields from CSV
                channels = []
                mail_styles = []
                try:
                    if pd.notna(row['channels']):
                        channels = json.loads(row['channels'])
                    if pd.notna(row['mail_styles']):
                        mail_styles = json.loads(row['mail_styles'])
                except json.JSONDecodeError:
                    print(f"⚠️ Warning: Could not parse JSON data for campaign {row['campaign_id']}")
                
                campaigns.append({
                    'campaign_id': row['campaign_id'],
                    'campaign_name': row['campaign_name'],
                    'description': row['description'] if pd.notna(row['description']) else '',
                    'created_date': row['created_date'],
                    'created_time': row['created_time'],
                    'date_started': row['date_started'] if pd.notna(row['date_started']) and row['date_started'] else None,
                    'date_last_modified': row['date_last_modified'] if pd.notna(row['date_last_modified']) else row['created_date'] + ' ' + row['created_time'],
                    'status': row['status'] if pd.notna(row['status']) else 'draft',
                    'channels': channels,
                    'mail_styles': mail_styles,
                    'prospects_list_id': row['prospects_list_id'] if pd.notna(row['prospects_list_id']) else None,
                    'prospects_count': int(row['prospects_count']) if pd.notna(row['prospects_count']) else 0,
                    'campaign_data': campaign_data,
                    'campaign_json_path': row['campaign_json_path'] if pd.notna(row['campaign_json_path']) else None
                })
            
            return campaigns
            
        except Exception as e:
            print(f"❌ Error getting campaigns for {user_email}: {str(e)}")
            return []
            
    def update_campaign(self, user_email: str, campaign_id: str, updates: Dict) -> bool:
        """Update campaign data"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            # Check if updating campaign name and if it would create a duplicate
            if 'campaign_name' in updates:
                if self._check_campaign_name_exists(user_email, updates['campaign_name'], exclude_campaign_id=campaign_id):
                    print(f"❌ Campaign name '{updates['campaign_name']}' already exists for {user_email}")
                    return False
            
            # Read CSV to find the campaign
            df = pd.read_csv(csv_path)
            target_row = df[df['campaign_id'] == campaign_id]
            
            if target_row.empty:
                print(f"❌ Campaign {campaign_id} not found for {user_email}")
                return False
            
            # Load existing campaign data
            json_path = target_row.iloc[0]['campaign_json_path']
            campaign_data = {}
            
            if pd.notna(json_path) and os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    campaign_data = json.load(f)
            
            # Update campaign data
            campaign_data.update(updates)
            campaign_data['date_last_modified'] = datetime.now().isoformat()
            
            # Update JSON file
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(campaign_data, f, indent=2, ensure_ascii=False)
            
            # Update CSV
            df.loc[df['campaign_id'] == campaign_id, 'date_last_modified'] = datetime.now().isoformat()
            
            # Update specific CSV fields if provided in updates
            if 'campaign_name' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'campaign_name'] = updates['campaign_name']
            if 'description' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'description'] = updates['description']
            if 'status' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'status'] = updates['status']
            if 'channels' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'channels'] = json.dumps(updates['channels'])
            if 'mail_styles' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'mail_styles'] = json.dumps(updates['mail_styles'])
            if 'prospects_list_id' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'prospects_list_id'] = updates['prospects_list_id']
            if 'prospects_count' in updates:
                df.loc[df['campaign_id'] == campaign_id, 'prospects_count'] = updates['prospects_count']
                
            df.to_csv(csv_path, index=False)
            
            print(f"✅ Updated campaign {campaign_id} for {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating campaign: {str(e)}")
            return False
    
    def delete_campaign(self, user_email: str, campaign_id: str) -> bool:
        """Delete a campaign"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            df = pd.read_csv(csv_path)
            
            # Find and delete JSON file
            target_row = df[df['campaign_id'] == campaign_id]
            if not target_row.empty:
                json_path = target_row.iloc[0]['campaign_json_path']
                if pd.notna(json_path) and os.path.exists(json_path):
                    os.remove(json_path)
            
            # Remove from CSV
            df = df[df['campaign_id'] != campaign_id]
            df.to_csv(csv_path, index=False)
            
            print(f"✅ Deleted campaign {campaign_id} for {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error deleting campaign: {str(e)}")
            return False
            
    def get_campaign_by_id(self, user_email: str, campaign_id: str) -> Optional[Dict]:
        """Get specific campaign by ID"""
        campaigns = self.get_user_campaigns(user_email)
        for campaign in campaigns:
            if campaign['campaign_id'] == campaign_id:
                return campaign
        return None
        
    def start_campaign(self, user_email: str, campaign_id: str) -> bool:
        """Start a campaign (change status from draft to active)"""
        updates = {
            'status': 'active',
            'date_started': datetime.now().isoformat()
        }
        return self.update_campaign(user_email, campaign_id, updates)
        
    def pause_campaign(self, user_email: str, campaign_id: str) -> bool:
        """Pause a campaign"""
        updates = {'status': 'paused'}
        return self.update_campaign(user_email, campaign_id, updates)
        
    def complete_campaign(self, user_email: str, campaign_id: str) -> bool:
        """Complete a campaign"""
        updates = {'status': 'completed'}
        return self.update_campaign(user_email, campaign_id, updates)