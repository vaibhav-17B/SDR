import csv
import os
import json
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict, Any
from base_models import MailCompositionList, MailListTemplates, EmailTemplate, CreateMailListRequest, UpdateMailListRequest
import uuid

class MailListsManager:
    def __init__(self, base_folder: str = "user_mail_lists"):
        self.base_folder = base_folder
        self.csv_headers = [
            'list_id', 'list_name', 'description', 'created_date', 
            'created_time', 'last_updated', 'mail_type', 'status', 
            'templates_count', 'json_file_path'
        ]
        self._ensure_base_folder_exists()
    
    def _ensure_base_folder_exists(self):
        """Create base user mail lists folder if it doesn't exist"""
        if not os.path.exists(self.base_folder):
            os.makedirs(self.base_folder)
            print(f"Created base mail lists folder: {self.base_folder}")
    
    def _get_user_folder_name(self, user_email: str) -> str:
        """Convert user email to folder name (replace @ and . with _)"""
        return user_email.replace('@', '_at_').replace('.', '_')
    
    def _get_user_folder_path(self, user_email: str) -> str:
        """Get user-specific folder path"""
        user_folder_name = self._get_user_folder_name(user_email)
        return os.path.join(self.base_folder, user_folder_name)
    
    def _ensure_user_folder_exists(self, user_email: str) -> str:
        """Create user-specific folder if it doesn't exist"""
        user_folder_path = self._get_user_folder_path(user_email)
        
        if not os.path.exists(user_folder_path):
            os.makedirs(user_folder_path)
            print(f"Created user mail lists folder: {user_folder_path}")
        
        return user_folder_path
    
    def _get_user_csv_path(self, user_email: str) -> str:
        """Get user's mail lists CSV file path"""
        user_folder_path = self._ensure_user_folder_exists(user_email)
        return os.path.join(user_folder_path, "mail_lists.csv")
    
    def _ensure_user_csv_exists(self, user_email: str):
        """Create user's CSV file with headers if it doesn't exist"""
        csv_path = self._get_user_csv_path(user_email)
        
        if not os.path.exists(csv_path):
            with open(csv_path, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.csv_headers)
                writer.writeheader()
            print(f"Created user mail lists CSV: {csv_path}")
    
    def _generate_list_filename(self, user_email: str, list_name: str) -> str:
        """Generate list JSON filename"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Clean list name for filename
        clean_name = "".join(c for c in list_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        clean_name = clean_name.replace(' ', '_')[:20]  # Limit length
        return f"list_{timestamp}_{clean_name}.json"
    
    def _create_default_templates(self, list_id: str, user_email: str) -> List[EmailTemplate]:
        """Create default email templates for a new list"""
        now = datetime.now()
        created_date = now.strftime("%Y-%m-%d")
        
        default_templates = [
            EmailTemplate(
                template_id="initial_mail",
                template_name="Initial Outreach",
                subject="",
                body="",
                cc="",
                bcc="",
                created_date=created_date,
                last_updated=created_date
            ),
            EmailTemplate(
                template_id="follow_up_1",
                template_name="First Follow-up",
                subject="",
                body="",
                cc="",
                bcc="",
                created_date=created_date,
                last_updated=created_date
            ),
            EmailTemplate(
                template_id="follow_up_2",
                template_name="Second Follow-up",
                subject="",
                body="",
                cc="",
                bcc="",
                created_date=created_date,
                last_updated=created_date
            )
        ]
        
        return default_templates
    
    def get_all_lists(self, user_email: str) -> List[MailCompositionList]:
        """Get all mail lists for a user"""
        lists = []
        
        try:
            csv_path = self._get_user_csv_path(user_email)
            
            if not os.path.exists(csv_path):
                print(f"CSV file not found: {csv_path}")
                return lists
            
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Skip empty rows
                    if not row.get('list_id'):
                        continue
                    
                    # Convert empty strings to None for optional fields
                    list_data = {}
                    for key, value in row.items():
                        if value == '' or value is None:
                            list_data[key] = None
                        elif key == 'templates_count':
                            list_data[key] = int(value) if value and value.isdigit() else 0
                        else:
                            list_data[key] = value
                    
                    lists.append(MailCompositionList(**list_data))
                    
            print(f"📋 Loaded {len(lists)} mail lists from user CSV")
            return lists
            
        except Exception as e:
            print(f"Error reading mail lists CSV: {str(e)}")
            return lists
    
    def get_list_templates(self, user_email: str, list_id: str) -> Optional[MailListTemplates]:
        """Get complete list with all templates"""
        try:
            # First get list metadata
            lists = self.get_all_lists(user_email)
            list_meta = None
            
            for list in lists:
                if list.list_id == list_id:
                    list_meta = list
                    break
            
            if not list_meta:
                print(f"List not found: {list_id}")
                return None
            
            # Check if JSON file exists
            if not list_meta.json_file_path:
                print(f"No templates saved yet for list: {list_id}")
                return None
            
            # Load templates from JSON file
            user_folder = self._get_user_folder_path(user_email)
            json_path = os.path.join(user_folder, list_meta.json_file_path)
            
            if not os.path.exists(json_path):
                print(f"List JSON file not found: {json_path}")
                return None
            
            with open(json_path, 'r', encoding='utf-8') as file:
                list_data = json.load(file)
            
            # Convert to MailListTemplates model
            templates = [EmailTemplate(**template) for template in list_data.get('templates', [])]
            
            list_templates = MailListTemplates(
                list_id=list_data['list_id'],  # Map list_id to list_id
                list_name=list_data['list_name'],  # Map list_name to list_name
                description=list_data.get('description'),
                created_date=list_data['created_date'],
                created_time=list_data['created_time'],
                last_updated=list_data['last_updated'],
                mail_type=list_data.get('mail_type'),
                status=list_data.get('status', 'draft'),
                user_email=list_data['user_email'],
                templates=templates
            )
            
            return list_templates
            
        except Exception as e:
            print(f"Error loading list templates: {str(e)}")
            return None
    
    def create_list(self, request: CreateMailListRequest, user_email: str) -> MailCompositionList:
        """Create a new mail list with default templates"""
        try:
            # Ensure user folder and CSV exist
            self._ensure_user_csv_exists(user_email)
            
            # Generate unique list ID 
            list_id = f"list-{uuid.uuid4().hex[:8]}"
            
            # Get current timestamp
            now = datetime.now()
            created_date = now.strftime("%Y-%m-%d")
            created_time = now.strftime("%H:%M")
            last_updated = now.strftime("%Y-%m-%d %H:%M:%S")
            
            # Create list metadata for CSV (no JSON file created yet)
            new_list = MailCompositionList(
                list_id=list_id,  # Map list_id to list_id
                list_name=request.list_name,  # Use new field name
                description=request.description,
                created_date=created_date,
                created_time=created_time,
                last_updated=last_updated,
                mail_type=request.mail_type,
                status="draft",
                templates_count=0,  # No templates yet
                json_file_path=None  # Will be set when templates are first saved
            )
            
            # Append to CSV
            csv_path = self._get_user_csv_path(user_email)
            with open(csv_path, 'a', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.csv_headers)
                writer.writerow({
                    'list_id': new_list.list_id,
                    'list_name': new_list.list_name,
                    'description': new_list.description or '',
                    'created_date': new_list.created_date,
                    'created_time': new_list.created_time,
                    'last_updated': new_list.last_updated,
                    'mail_type': new_list.mail_type or '',
                    'status': new_list.status,
                    'templates_count': new_list.templates_count,
                    'json_file_path': new_list.json_file_path or ''  # Handle None value
                })
            
            print(f"Created mail list: {list_id} (no templates yet - will be saved when user clicks Save)")
            return new_list
            
        except Exception as e:
            print(f"Error creating mail list: {str(e)}")
            raise e
    
    def update_list_metadata(self, request: UpdateMailListRequest, user_email: str) -> Optional[MailCompositionList]:
        """Update list metadata in CSV"""
        try:
            lists = self.get_all_lists(user_email)
            list_found = False
            
            for i, list in enumerate(lists):
                if list.list_id == request.list_id:
                    # Update fields if provided
                    if request.list_name:
                        lists[i].list_name = request.list_name
                    if request.description is not None:
                        lists[i].description = request.description
                    if request.status:
                        lists[i].status = request.status
                    
                    # Update timestamp
                    lists[i].last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    list_found = True
                    updated_list = lists[i]
                    break
            
            if not list_found:
                return None
            
            # Write all lists back to CSV
            csv_path = self._get_user_csv_path(user_email)
            with open(csv_path, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.csv_headers)
                writer.writeheader()
                for list in lists:
                    writer.writerow({
                        'list_id': list.list_id,
                        'list_name': list.list_name,
                        'description': list.description or '',
                        'created_date': list.created_date,
                        'created_time': list.created_time,
                        'last_updated': list.last_updated,
                        'mail_type': list.mail_type or '',
                        'status': list.status,
                        'templates_count': list.templates_count,
                        'json_file_path': list.json_file_path
                    })
            
            print(f"Updated list metadata: {request.list_id}")
            return updated_list
            
        except Exception as e:
            print(f"Error updating list metadata: {str(e)}")
            return None
    
    def update_list_templates(self, user_email: str, list_id: str, templates: List[EmailTemplate]) -> bool:
        """Update list templates in JSON file (create file if first save)"""
        try:
            # Get list metadata
            lists = self.get_all_lists(user_email)
            current_list = None
            
            for list_item in lists:
                if list_item.list_id == list_id:
                    current_list = list_item
                    break
            
            if not current_list:
                print(f"List not found: {list_id}")
                return False
            
            user_folder = self._get_user_folder_path(user_email)
            json_filename = current_list.json_file_path
            
            # If no JSON file exists yet (first save), create filename
            if not json_filename:
                json_filename = self._generate_list_filename(user_email, current_list.list_name)
                print(f"Creating first JSON file for list {list_id}: {json_filename}")
            
            # Create or get existing list templates object
            if current_list.json_file_path and os.path.exists(os.path.join(user_folder, current_list.json_file_path)):
                # Load existing templates
                list_templates = self.get_list_templates(user_email, list_id)
                if not list_templates:
                    return False
                list_templates.templates = templates
                list_templates.last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            else:
                # Create new list templates object (first save)
                list_templates = MailListTemplates(
                    list_id=current_list.list_id,
                    list_name=current_list.list_name,
                    description=current_list.description,
                    created_date=current_list.created_date,
                    created_time=current_list.created_time,
                    last_updated=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    mail_type=current_list.mail_type,
                    status=current_list.status,
                    user_email=user_email,
                    templates=templates
                )
            
            # Save templates to JSON file
            json_path = os.path.join(user_folder, json_filename)
            
            with open(json_path, 'w', encoding='utf-8') as file:
                json.dump(list_templates.dict(), file, indent=2, ensure_ascii=False)
            
            # Update CSV with JSON filename and template count if this is first save
            if not current_list.json_file_path:
                self._update_list_csv_entry(user_email, list_id, json_filename, len(templates))
            
            print(f"{'Created' if not current_list.json_file_path else 'Updated'} list templates: {list_id}")
            return True
            
        except Exception as e:
            print(f"Error updating list templates: {str(e)}")
            return False
    
    def _update_list_csv_entry(self, user_email: str, list_id: str, json_filename: str, templates_count: int) -> bool:
        """Update CSV entry with JSON filename and template count"""
        try:
            lists = self.get_all_lists(user_email)
            
            # Update the specific list
            for i, list_item in enumerate(lists):
                if list_item.list_id == list_id:
                    lists[i].json_file_path = json_filename
                    lists[i].templates_count = templates_count
                    lists[i].last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    break
            
            # Write all lists back to CSV
            csv_path = self._get_user_csv_path(user_email)
            with open(csv_path, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.csv_headers)
                writer.writeheader()
                for list_item in lists:
                    writer.writerow({
                        'list_id': list_item.list_id,
                        'list_name': list_item.list_name,
                        'description': list_item.description or '',
                        'created_date': list_item.created_date,
                        'created_time': list_item.created_time,
                        'last_updated': list_item.last_updated,
                        'mail_type': list_item.mail_type or '',
                        'status': list_item.status,
                        'templates_count': list_item.templates_count,
                        'json_file_path': list_item.json_file_path or ''
                    })
            
            print(f"Updated CSV entry for list {list_id} with JSON file {json_filename}")
            return True
            
        except Exception as e:
            print(f"Error updating CSV entry: {str(e)}")
            return False
    
    def delete_list(self, list_id: str, user_email: str) -> bool:
        """Delete a mail list and its JSON file"""
        try:
            lists = self.get_all_lists(user_email)
            original_count = len(lists)
            json_filename = None
            
            # Find the list to delete and get JSON filename
            updated_lists = []
            for list in lists:
                if list.list_id == list_id:
                    json_filename = list.json_file_path
                else:
                    updated_lists.append(list)
            
            if len(updated_lists) == original_count:
                print(f"List not found for deletion: {list_id}")
                return False
            
            # Delete JSON file
            if json_filename:
                user_folder = self._get_user_folder_path(user_email)
                json_path = os.path.join(user_folder, json_filename)
                
                if os.path.exists(json_path):
                    os.remove(json_path)
                    print(f"Deleted list JSON file: {json_path}")
            
            # Write remaining lists back to CSV
            csv_path = self._get_user_csv_path(user_email)
            with open(csv_path, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.csv_headers)
                writer.writeheader()
                for list in updated_lists:
                    writer.writerow({
                        'list_id': list.list_id,
                        'list_name': list.list_name,
                        'description': list.description or '',
                        'created_date': list.created_date,
                        'created_time': list.created_time,
                        'last_updated': list.last_updated,
                        'mail_type': list.mail_type or '',
                        'status': list.status,
                        'templates_count': list.templates_count,
                        'json_file_path': list.json_file_path
                    })
            
            print(f"Deleted mail list: {list_id}")
            return True
            
        except Exception as e:
            print(f"Error deleting mail list: {str(e)}")
            return False

# Create global instance
mail_lists_manager = MailListsManager()