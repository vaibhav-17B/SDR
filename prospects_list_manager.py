import os
import json
import csv
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any

class ProspectsListManager:
    def __init__(self, base_folder: str = "user_prospects_lists"):
        self.base_folder = base_folder
        os.makedirs(base_folder, exist_ok=True)
        
    def _get_user_folder(self, user_email: str) -> str:
        """Create user-specific folder based on email"""
        safe_email = user_email.replace('@', '_at_').replace('.', '_')
        user_folder = os.path.join(self.base_folder, safe_email)
        os.makedirs(user_folder, exist_ok=True)
        return user_folder
        
    def _get_csv_file_path(self, user_email: str) -> str:
        """Get path to user's prospects lists CSV file"""
        user_folder = self._get_user_folder(user_email)
        return os.path.join(user_folder, "prospects_lists.csv")
        
    def _ensure_csv_exists(self, csv_path: str):
        """Create CSV file with headers if it doesn't exist"""
        if not os.path.exists(csv_path):
            headers = [
                'list_id', 'list_name', 'description', 'created_date', 'created_time',
                'total_prospects', 'prospects_json_path', 'last_updated', 'tags'
            ]
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                
    def create_prospects_list(self, user_email: str, list_name: str, prospects: List[Dict], description: str = "", tags: List[str] = None) -> str:
        """Create a new prospects list for a user"""
        try:
            user_folder = self._get_user_folder(user_email)
            csv_path = self._get_csv_file_path(user_email)
            self._ensure_csv_exists(csv_path)
            
            # Generate unique list ID
            timestamp = datetime.now()
            list_id = f"list_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            
            # Save prospects to JSON file
            json_filename = f"{list_id}_{list_name.replace(' ', '_').replace('/', '_')}.json"
            json_path = os.path.join(user_folder, json_filename)
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'list_id': list_id,
                    'list_name': list_name,
                    'description': description,
                    'prospects': prospects,
                    'total_count': len(prospects),
                    'created_timestamp': timestamp.isoformat(),
                    'tags': tags or []
                }, f, indent=2, ensure_ascii=False)
            
            # Prepare CSV row data
            csv_row = [
                list_id,
                list_name,
                description,
                timestamp.strftime('%Y-%m-%d'),
                timestamp.strftime('%H:%M:%S'),
                len(prospects),
                json_path,
                timestamp.isoformat(),
                '; '.join(tags) if tags else ''
            ]
            
            # Append to CSV
            with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(csv_row)
            
            print(f"✅ Prospects list created for {user_email}: {list_name} ({list_id})")
            return list_id
            
        except Exception as e:
            print(f"❌ Error creating prospects list for {user_email}: {str(e)}")
            return None
            
    def get_user_prospects_lists(self, user_email: str) -> List[Dict]:
        """Get user's prospects lists (most recent first)"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return []
            
            # Read CSV and convert to list of dicts
            df = pd.read_csv(csv_path)
            
            # Sort by created_date and created_time (most recent first)
            df['datetime'] = pd.to_datetime(df['created_date'] + ' ' + df['created_time'])
            df = df.sort_values('datetime', ascending=False)
            
            lists = []
            for _, row in df.iterrows():
                # Load JSON prospects if file exists
                prospects_data = []
                if pd.notna(row['prospects_json_path']) and os.path.exists(row['prospects_json_path']):
                    try:
                        with open(row['prospects_json_path'], 'r', encoding='utf-8') as f:
                            json_data = json.load(f)
                            prospects_data = json_data.get('prospects', [])
                    except Exception as e:
                        print(f"⚠️ Warning: Could not load prospects file {row['prospects_json_path']}: {e}")
                
                lists.append({
                    'list_id': row['list_id'],
                    'list_name': row['list_name'],
                    'description': row['description'] if pd.notna(row['description']) else '',
                    'created_date': row['created_date'],
                    'created_time': row['created_time'],
                    'total_prospects': int(row['total_prospects']) if pd.notna(row['total_prospects']) else 0,
                    'prospects': prospects_data,
                    'last_updated': row['last_updated'] if pd.notna(row['last_updated']) else row['created_date'] + ' ' + row['created_time'],
                    'tags': [tag.strip() for tag in str(row['tags']).split(';') if tag.strip()] if pd.notna(row['tags']) else [],
                    'prospects_json_path': row['prospects_json_path'] if pd.notna(row['prospects_json_path']) else None
                })
            
            return lists
            
        except Exception as e:
            print(f"❌ Error getting prospects lists for {user_email}: {str(e)}")
            return []
            
    def add_prospects_to_list(self, user_email: str, list_id: str, new_prospects: List[Dict]) -> bool:
        """Add prospects to an existing list"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            # Read CSV to find the list
            df = pd.read_csv(csv_path)
            target_row = df[df['list_id'] == list_id]
            
            if target_row.empty:
                print(f"❌ List {list_id} not found for {user_email}")
                return False
            
            # Load existing prospects
            json_path = target_row.iloc[0]['prospects_json_path']
            existing_data = {}
            
            if pd.notna(json_path) and os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            
            # Merge prospects (avoid duplicates based on email)
            existing_prospects = existing_data.get('prospects', [])
            existing_emails = set()
            
            for prospect in existing_prospects:
                email = self._extract_email_from_prospect(prospect)
                if email:
                    existing_emails.add(email.lower())
            
            # Add new prospects that don't already exist
            added_count = 0
            for prospect in new_prospects:
                email = self._extract_email_from_prospect(prospect)
                if email and email.lower() not in existing_emails:
                    existing_prospects.append(prospect)
                    existing_emails.add(email.lower())
                    added_count += 1
            
            # Update JSON file
            updated_data = {
                **existing_data,
                'prospects': existing_prospects,
                'total_count': len(existing_prospects),
                'last_updated': datetime.now().isoformat()
            }
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, indent=2, ensure_ascii=False)
            
            # Update CSV
            df.loc[df['list_id'] == list_id, 'total_prospects'] = len(existing_prospects)
            df.loc[df['list_id'] == list_id, 'last_updated'] = datetime.now().isoformat()
            df.to_csv(csv_path, index=False)
            
            print(f"✅ Added {added_count} new prospects to list {list_id} for {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error adding prospects to list: {str(e)}")
            return False
    
    def _extract_email_from_prospect(self, prospect: Dict) -> Optional[str]:
        """Extract email from prospect data structure"""
        # Try different possible email field locations
        email_fields = [
            'personal_information.primary_professional_email',
            'contact_information.primary_email',
            'email',
            'primary_email'
        ]
        
        for field_path in email_fields:
            value = prospect
            for key in field_path.split('.'):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    value = None
                    break
            if value and isinstance(value, str):
                return value
        return None
            
    def delete_prospects_list(self, user_email: str, list_id: str) -> bool:
        """Delete a prospects list"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            df = pd.read_csv(csv_path)
            
            # Find and delete JSON file
            target_row = df[df['list_id'] == list_id]
            if not target_row.empty:
                json_path = target_row.iloc[0]['prospects_json_path']
                if pd.notna(json_path) and os.path.exists(json_path):
                    os.remove(json_path)
            
            # Remove from CSV
            df = df[df['list_id'] != list_id]
            df.to_csv(csv_path, index=False)
            
            print(f"✅ Deleted prospects list {list_id} for {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error deleting prospects list: {str(e)}")
            return False
            
    def get_prospects_list_by_id(self, user_email: str, list_id: str) -> Optional[Dict]:
        """Get specific prospects list by ID"""
        lists = self.get_user_prospects_lists(user_email)
        for prospects_list in lists:
            if prospects_list['list_id'] == list_id:
                return prospects_list
        return None
        
    def rename_prospects_list(self, user_email: str, list_id: str, new_name: str) -> bool:
        """Rename a prospects list"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            df = pd.read_csv(csv_path)
            
            # Update list name in CSV
            df.loc[df['list_id'] == list_id, 'list_name'] = new_name
            df.loc[df['list_id'] == list_id, 'last_updated'] = datetime.now().isoformat()
            df.to_csv(csv_path, index=False)
            
            # Update JSON file
            target_row = df[df['list_id'] == list_id]
            if not target_row.empty:
                json_path = target_row.iloc[0]['prospects_json_path']
                if pd.notna(json_path) and os.path.exists(json_path):
                    with open(json_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    data['list_name'] = new_name
                    data['last_updated'] = datetime.now().isoformat()
                    
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Renamed prospects list {list_id} to '{new_name}' for {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error renaming prospects list: {str(e)}")
            return False
    
    def remove_prospect_from_list(self, user_email: str, list_id: str, prospect_index: int) -> bool:
        """Remove a prospect from a list by index"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return False
            
            # Read CSV to find the list
            df = pd.read_csv(csv_path)
            target_row = df[df['list_id'] == list_id]
            
            if target_row.empty:
                print(f"❌ List {list_id} not found for {user_email}")
                return False
            
            # Load existing prospects
            json_path = target_row.iloc[0]['prospects_json_path']
            
            if not pd.notna(json_path) or not os.path.exists(json_path):
                print(f"❌ Prospects file not found for list {list_id}")
                return False
                
            with open(json_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            
            prospects = existing_data.get('prospects', [])
            
            # Check if index is valid
            if prospect_index < 0 or prospect_index >= len(prospects):
                print(f"❌ Invalid prospect index {prospect_index} for list {list_id}")
                return False
            
            # Remove prospect at index
            removed_prospect = prospects.pop(prospect_index)
            print(f"🗑️ Removing prospect: {self._extract_email_from_prospect(removed_prospect)}")
            
            # Update JSON file
            updated_data = {
                **existing_data,
                'prospects': prospects,
                'total_count': len(prospects),
                'last_updated': datetime.now().isoformat()
            }
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, indent=2, ensure_ascii=False)
            
            # Update CSV
            df.loc[df['list_id'] == list_id, 'total_prospects'] = len(prospects)
            df.loc[df['list_id'] == list_id, 'last_updated'] = datetime.now().isoformat()
            df.to_csv(csv_path, index=False)
            
            print(f"✅ Removed prospect from list {list_id} for {user_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error removing prospect from list: {str(e)}")
            return False