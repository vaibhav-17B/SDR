import os
import json
import csv
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

class SearchHistoryManager:
    def __init__(self, base_folder: str = "user_search_history"):
        self.base_folder = base_folder
        os.makedirs(base_folder, exist_ok=True)
        
    def _get_user_folder(self, user_email: str) -> str:
        """Create user-specific folder based on email"""
        # Sanitize email for folder name
        safe_email = user_email.replace('@', '_at_').replace('.', '_')
        user_folder = os.path.join(self.base_folder, safe_email)
        os.makedirs(user_folder, exist_ok=True)
        return user_folder
        
    def _get_csv_file_path(self, user_email: str) -> str:
        """Get path to user's search history CSV file"""
        user_folder = self._get_user_folder(user_email)
        return os.path.join(user_folder, "search_history.csv")
        
    def _ensure_csv_exists(self, csv_path: str):
        """Create CSV file with headers if it doesn't exist"""
        if not os.path.exists(csv_path):
            headers = [
                'search_id', 'search_date', 'search_time', 'total_results',
                'job_titles', 'company_names', 'company_domains', 'departments',
                'company_size', 'company_revenue', 'company_industry', 'company_sub_industry',
                'seniority', 'technologies', 'location_preference', 'countries', 'states', 'cities',
                'result_json_path'
            ]
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                
    def save_search_history(self, user_email: str, search_params: Dict[str, Any], search_results: List[Dict]) -> str:
        """Save search parameters and results for a user"""
        try:
            user_folder = self._get_user_folder(user_email)
            csv_path = self._get_csv_file_path(user_email)
            self._ensure_csv_exists(csv_path)
            
            # Generate unique search ID
            timestamp = datetime.now()
            search_id = f"search_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            
            # Save results to JSON file
            json_filename = f"{search_id}_results.json"
            json_path = os.path.join(user_folder, json_filename)
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'search_id': search_id,
                    'search_params': search_params,
                    'results': search_results,
                    'total_count': len(search_results),
                    'timestamp': timestamp.isoformat()
                }, f, indent=2, ensure_ascii=False)
            
            # Prepare CSV row data
            def format_list_field(field_value):
                if isinstance(field_value, list):
                    return '; '.join(str(item) for item in field_value if item)
                return str(field_value) if field_value else ''
            
            csv_row = [
                search_id,
                timestamp.strftime('%Y-%m-%d'),
                timestamp.strftime('%H:%M:%S'),
                len(search_results),
                format_list_field(search_params.get('job_titles', [])),
                format_list_field(search_params.get('company_names', [])),
                format_list_field(search_params.get('company_domains', [])),
                format_list_field(search_params.get('departments', [])),
                format_list_field(search_params.get('company_size', [])),
                format_list_field(search_params.get('company_revenue', [])),
                format_list_field(search_params.get('company_industry', [])),
                format_list_field(search_params.get('company_sub_industry', [])),
                format_list_field(search_params.get('seniority', [])),
                format_list_field(search_params.get('technologies', [])),
                search_params.get('location_preference', ''),
                format_list_field(search_params.get('countries', [])),
                format_list_field(search_params.get('states', [])),
                format_list_field(search_params.get('cities', [])),
                json_path
            ]
            
            # Append to CSV
            with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(csv_row)
            
            print(f"✅ Search history saved for {user_email}: {search_id}")
            return search_id
            
        except Exception as e:
            print(f"❌ Error saving search history for {user_email}: {str(e)}")
            return None
            
    def get_user_search_history(self, user_email: str, limit: int = 10) -> List[Dict]:
        """Get user's search history (most recent first)"""
        try:
            csv_path = self._get_csv_file_path(user_email)
            
            if not os.path.exists(csv_path):
                return []
            
            # Read CSV and convert to list of dicts
            df = pd.read_csv(csv_path)
            
            # Sort by search_date and search_time (most recent first)
            df['datetime'] = pd.to_datetime(df['search_date'] + ' ' + df['search_time'])
            df = df.sort_values('datetime', ascending=False)
            
            # Limit results
            df = df.head(limit)
            
            history = []
            for _, row in df.iterrows():
                # Load JSON results if file exists
                results_data = []
                if pd.notna(row['result_json_path']) and os.path.exists(row['result_json_path']):
                    try:
                        with open(row['result_json_path'], 'r', encoding='utf-8') as f:
                            json_data = json.load(f)
                            results_data = json_data.get('results', [])
                    except Exception as e:
                        print(f"⚠️ Warning: Could not load results file {row['result_json_path']}: {e}")
                
                # Parse search parameters
                search_params = {}
                param_fields = [
                    'job_titles', 'company_names', 'company_domains', 'departments',
                    'company_size', 'company_revenue', 'company_industry', 'company_sub_industry',
                    'seniority', 'technologies', 'location_preference', 'countries', 'states', 'cities'
                ]
                
                for field in param_fields:
                    value = row.get(field, '')
                    if pd.notna(value) and value:
                        if field == 'location_preference':
                            search_params[field] = str(value)
                        else:
                            # Convert semicolon-separated string back to list
                            search_params[field] = [item.strip() for item in str(value).split(';') if item.strip()]
                
                history.append({
                    'search_id': row['search_id'],
                    'search_date': row['search_date'],
                    'search_time': row['search_time'],
                    'total_results': int(row['total_results']) if pd.notna(row['total_results']) else 0,
                    'search_params': search_params,
                    'results': results_data,
                    'result_json_path': row['result_json_path'] if pd.notna(row['result_json_path']) else None
                })
            
            return history
            
        except Exception as e:
            print(f"❌ Error getting search history for {user_email}: {str(e)}")
            return []
            
    def get_search_by_id(self, user_email: str, search_id: str) -> Optional[Dict]:
        """Get specific search by ID"""
        history = self.get_user_search_history(user_email, limit=100)  # Get more records to find specific ID
        for search in history:
            if search['search_id'] == search_id:
                return search
        return None
        
    def delete_search_history(self, user_email: str, search_id: str = None) -> bool:
        """Delete specific search or all history for user"""
        try:
            user_folder = self._get_user_folder(user_email)
            csv_path = self._get_csv_file_path(user_email)
            
            if search_id:
                # Delete specific search
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    
                    # Find and delete JSON file
                    target_row = df[df['search_id'] == search_id]
                    if not target_row.empty:
                        json_path = target_row.iloc[0]['result_json_path']
                        if pd.notna(json_path) and os.path.exists(json_path):
                            os.remove(json_path)
                    
                    # Remove from CSV
                    df = df[df['search_id'] != search_id]
                    df.to_csv(csv_path, index=False)
                    
                print(f"✅ Deleted search {search_id} for {user_email}")
            else:
                # Delete all history for user
                if os.path.exists(user_folder):
                    import shutil
                    shutil.rmtree(user_folder)
                print(f"✅ Deleted all search history for {user_email}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error deleting search history: {str(e)}")
            return False