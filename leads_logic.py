from base_models import UserData, EmailGenerationParams, EmailSendRequest, LeadSearchRequest
from typing import Optional, List, Dict,Tuple,Any
import json
import requests
from dotenv import load_dotenv
import os
import logging
import glob

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


load_dotenv()
CS_key=os.getenv("CS_API_KEY")

def fetch_sample_leads(path: str = "V:/BASAL/MCP_servers/core_signal/LEAD_MULTI_SOURCE/"):
    leads_paths = glob.glob(f"{path}/**/*response.json", recursive=True)
    print(f"Found {len(leads_paths)} lead files.")
    
    sample_leads = []
    for lead_path in leads_paths:
        try:
            with open(lead_path, 'r', encoding='utf-8') as f:
                lead_data = json.load(f)  # Read and parse the JSON content
                sample_leads.append(lead_data)
        except Exception as e:
            print(f"❌ Error reading {lead_path}: {e}")
    
    return sample_leads
        

class LeadFinder:
    def __init__(self, leads: Optional[List[Dict]] = None,test:bool=False):
        self.leads = leads or fetch_sample_leads()
        self.test=test

    def generate_dynamic_icp_query(self, request: LeadSearchRequest):
        """
        Generate dynamic Elasticsearch query for ICP targeting based on provided parameters.
        
        Args:
            job_titles (list): List of job titles to search for
            company_names (list): List of company names
            company_domains (list): List of company domains
            departments (list): List of departments
            company_size (list): List of company size ranges
            company_revenue (list): List of company revenue ranges
            company_industry (list): List of company industries
            company_sub_industry (list): List of company sub-industries
            seniority (list): List of seniority levels
            technologies (list): List of technologies
            location_preference (str): Location preference (Remote, Hybrid, On-site)
            countries (list): List of countries
            states (list): List of states
            cities (list): List of cities
        
        Returns:
            dict: Elasticsearch query payload
        """       
        company_sub_industry = request.company_sub_industry  # Now list
        # location_preference = request.location_preference    # Kept as string
        job_titles = request.job_titles
        company_names = request.company_names
        company_domains = request.company_domains
        departments = request.departments
        company_size = request.company_size                  # Now list
        company_revenue = request.company_revenue            # Now list
        company_industry = request.company_industry          # Now list
        seniority = request.seniority                        # Now list
        technologies = request.technologies
        countries = request.countries
        states = request.states
        cities = request.cities
        
        must_conditions = []
        
        # Helper function to create OR conditions for lists
        def create_should_conditions(field_path, values, is_nested=False, is_exact=False):
            if not values or not any(values):
                return None
            
            conditions = []
            for value in values:
                if value and value.strip():  # Skip empty or whitespace-only values
                    if is_exact:
                        conditions.append({
                            "term": {
                                field_path: value.strip()
                            }
                        })
                    else:
                        conditions.append({
                            "match": {
                                field_path: value.strip()
                            }
                        })
            
            if not conditions:
                return None
                
            return {
                "bool": {
                    "should": conditions
                }
            }
        
        # Helper function to create range conditions for company size/revenue - Updated for lists
        def create_range_condition(field_path, range_values):
            if not range_values or not any(range_values):
                return None
                
            range_mappings = {
                # Company Size mappings
                "1-10": {"gte": 1, "lte": 10},
                "11-50": {"gte": 11, "lte": 50},
                "51-200": {"gte": 51, "lte": 200},
                "201-500": {"gte": 201, "lte": 500},
                "501-1000": {"gte": 501, "lte": 1000},
                "1001-5000": {"gte": 1001, "lte": 5000},
                "5001-10000": {"gte": 5001, "lte": 10000},
                "10000+": {"gte": 10000},
                
                # Company Revenue mappings (in millions)
                "0-1M": {"gte": 0, "lte": 1000000},
                "1-10M": {"gte": 1000000, "lte": 10000000},
                "10-50M": {"gte": 10000000, "lte": 50000000},
                "50-100M": {"gte": 50000000, "lte": 100000000},
                "100-500M": {"gte": 100000000, "lte": 500000000},
                "500M-1B": {"gte": 500000000, "lte": 1000000000},
                "1B+": {"gte": 1000000000}
            }
            
            range_conditions = []
            for range_value in range_values:
                if range_value and range_value.strip():
                    range_config = range_mappings.get(range_value.strip())
                    if range_config:
                        range_conditions.append({
                            "range": {
                                field_path: range_config
                            }
                        })
            
            if not range_conditions:
                return None
            
            # If multiple ranges, use should (OR) logic
            if len(range_conditions) == 1:
                return range_conditions[0]
            else:
                return {
                    "bool": {
                        "should": range_conditions
                    }
                }
        
        # Job Titles - CORRECTED: Use active_experience_title (direct field, not nested)
        if job_titles:
            job_title_condition = create_should_conditions("active_experience_title", job_titles)
            if job_title_condition:
                must_conditions.append(job_title_condition)
        
        # Company Names - CORRECTED: Use experience.company_name (nested field)
        if company_names:
            company_name_condition = create_should_conditions("experience.company_name", company_names)
            if company_name_condition:
                must_conditions.append({
                    "nested": {
                        "path": "experience",
                        "query": company_name_condition
                    }
                })
        
        # Company Domains - CORRECTED: Use experience.company_website.exact (nested field)
        if company_domains:
            # Ensure domains have proper protocol
            formatted_domains = []
            for domain in company_domains:
                if domain and domain.strip():
                    domain = domain.strip()
                    if not domain.startswith(('http://', 'https://')):
                        domain = f"https://{domain}"
                    formatted_domains.append(domain)
            
            if formatted_domains:
                domain_condition = create_should_conditions("experience.company_website.exact", formatted_domains, is_exact=True)
                if domain_condition:
                    must_conditions.append({
                        "nested": {
                            "path": "experience",
                            "query": domain_condition
                        }
                    })
        
        # Departments - CORRECTED: Use experience.department (nested field)
        if departments:
            dept_condition = create_should_conditions("experience.department", departments)
            if dept_condition:
                must_conditions.append({
                    "nested": {
                        "path": "experience",
                        "query": dept_condition
                    }
                })
        
        # Company Size - CORRECTED: Use experience.company_employees_count (nested field) - Now handles list
        if company_size:
            size_condition = create_range_condition("experience.company_employees_count", company_size)
            if size_condition:
                must_conditions.append({
                    "nested": {
                        "path": "experience",
                        "query": size_condition
                    }
                })
        
        # Company Revenue - CORRECTED: Use experience.company_annual_revenue_source_1 (nested field) - Now handles list
        if company_revenue:
            revenue_condition = create_range_condition("experience.company_annual_revenue_source_1", company_revenue)
            if revenue_condition:
                must_conditions.append({
                    "nested": {
                        "path": "experience",
                        "query": revenue_condition
                    }
                })
        
        # Company Industry - CORRECTED: Use experience.company_industry (nested field) - Now handles list
        if company_industry:
            industry_condition = create_should_conditions("experience.company_industry", company_industry)
            if industry_condition:
                must_conditions.append({
                    "nested": {
                        "path": "experience",
                        "query": industry_condition
                    }
                })
        
        # Company Sub-Industry - REMOVED: Field doesn't exist in schema - Now handles list
        # The schema only has company_industry, no sub-industry field
        if company_sub_industry:
            # Using company_categories_and_keywords as closest alternative
            sub_industry_condition = create_should_conditions("experience.company_categories_and_keywords", company_sub_industry)
            if sub_industry_condition:
                must_conditions.append({
                    "nested": {
                        "path": "experience",
                        "query": sub_industry_condition
                    }
                })
        
        # Seniority - CORRECTED: Use active_experience_management_level (direct field) - Now handles list
        if seniority:
            seniority_condition = create_should_conditions("active_experience_management_level", seniority)
            if seniority_condition:
                must_conditions.append(seniority_condition)
        
        # Technologies - CORRECTED: Use inferred_skills (direct field) - no technology_stack field exists
        if technologies:
            tech_condition = create_should_conditions("inferred_skills", technologies)
            if tech_condition:
                must_conditions.append(tech_condition)
        
        # Location Preference - REMOVED: Field doesn't exist in schema - Kept as string
        # The schema doesn't have a location_preference field
        # if location_preference:
        #     # This field doesn't exist in the schema, so we'll skip it
        #     pass
        
        # Countries - CORRECTED: Use location_country (direct field, exact match)
        if countries:
            country_condition = create_should_conditions("location_country", countries, is_exact=True)
            if country_condition:
                must_conditions.append(country_condition)
        
        # States - REMOVED: Field doesn't exist in schema
        # The schema doesn't have a location_state field, only location_regions
        if states:
            state_condition = create_should_conditions("location_regions", states)
            if state_condition:
                must_conditions.append(state_condition)
        
        # Cities - REMOVED: Field doesn't exist in schema
        # The schema doesn't have a location_city field, using location_full as alternative
        if cities:
            city_condition = create_should_conditions("location_full", cities)
            if city_condition:
                must_conditions.append(city_condition)
        
        print(f"\nCreated Schema: {must_conditions}\n")
        # Build final query
        if not must_conditions:
            # Return match_all query if no conditions provided
            return {
                "query": {
                    "match_all": {}
                }
            }
        
        return {
            "query": {
                "bool": {
                    "must": must_conditions
                }
            }
        }

    # # Example usage:
    # if __name__ == "__main__":
    #     # Example 1: Basic search
    #     query1 = generate_dynamic_icp_query(
    #         job_titles=['CEO', 'CTO', 'Marketing Manager'],
    #         company_names=['Google', 'Facebook', 'Amazon'],
    #         countries=['United States', 'India'],
    #         cities=['San Francisco', 'New York', 'Bengaluru']
    #     )
        
    #     # Example 2: Complex search with all parameters
    #     query2 = generate_dynamic_icp_query(
    #         job_titles=['Head of Marketing', 'CMO'],
    #         company_domains=['google.com', 'facebook.com'],
    #         departments=['Marketing', 'Sales'],
    #         company_size='1001-5000',
    #         company_revenue='50-100M',
    #         company_industry='Technology',
    #         company_sub_industry='SaaS',
    #         seniority='Executive',
    #         technologies=['Python', 'JavaScript', 'AWS'],
    #         location_preference='Remote',
    #         countries=['United States'],
    #         states=['California', 'New York'],
    #         cities=['San Francisco', 'Los Angeles']
    #     )
        
    #     # Example 3: Minimal search (your example format)
    #     query3 = generate_dynamic_icp_query(
    #         job_titles=['ett34t'],
    #         company_names=[],
    #         company_domains=['34tr34'],
    #         departments=[],
    #         company_size='',
    #         company_revenue='',
    #         company_industry='',
    #         company_sub_industry='',
    #         seniority='',
    #         technologies=[],
    #         location_preference='',
    #         countries=[],
    #         states=[],
    #         cities=[]
    #     )
        
    #     print("Query 1:", query1)
    #     print("\nQuery 2:", query2)
    #     print("\nQuery 3:", query3)
    def fetch_IDs(self, request: LeadSearchRequest) -> Tuple[Optional[List], int]:
        """
        Fetch lead IDs from CoreSignal API with comprehensive error handling.
        
        Returns:
            Tuple of (lead_ids_list, num_leads) or (None, 0) on error
        """
        try:
            url = "https://api.coresignal.com/cdapi/v2/employee_multi_source/search/es_dsl"
            
            # Generate payload with error handling
            try:
                ICP_payload = self.generate_dynamic_icp_query(request)
                payload = json.dumps(ICP_payload)
            except (AttributeError, TypeError, ValueError) as e:
                logger.error(f"Error generating ICP query or converting to JSON: {e}")
                return None, 0
            except Exception as e:
                logger.error(f"Unexpected error during payload generation: {e}")
                return None, 0

            headers = {
                'Content-Type': 'application/json',
                'apikey': CS_key
            }

            # API request with timeout and error handling
            try:
                response_IDs = requests.post(
                    url, 
                    headers=headers, 
                    data=payload,
                    timeout=30  
                )
                response_IDs.raise_for_status() 
                
            except requests.exceptions.Timeout:
                logger.error("Request timed out while fetching IDs")
                return None, 0
            except requests.exceptions.ConnectionError:
                logger.error("Connection error while fetching IDs")
                return None, 0
            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP error while fetching IDs: {e}")
                return None, 0
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error while fetching IDs: {e}")
                return None, 0

            try:
                print(response_IDs.text)
                
                response_data = json.loads(response_IDs.text)
                
                if not isinstance(response_data, list):
                    logger.error("Invalid response format: expected list")
                    return None, 0
                    
                num_leads = len(response_data)
                print(f"Found {num_leads} number of Leads!!")
                
                return response_data, num_leads
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing JSON response: {e}")
                return None, 0
            except Exception as e:
                logger.error(f"Unexpected error processing response: {e}")
                return None, 0

        except Exception as e:
            logger.error(f"Unexpected error in fetch_IDs: {e}")
            return None, 0


    def fetch_leads(self, request: LeadSearchRequest, limit: int = 3) -> Optional[str]:
        """
        Fetch lead details from CoreSignal API with comprehensive error handling.
        
        Args:
            request: LeadSearchRequest object
            limit: Number of leads to return (default: 3)
        
        Returns:
            Lead data as JSON string or None on error
        """
        try:
            # If in test mode, return sample leads immediately
            if self.test:
                logger.info(f"Test mode enabled - returning up to {limit} sample leads")
                if self.leads:
                    # Return up to 'limit' number of leads
                    selected_leads = self.leads[:limit]
                    return json.dumps(selected_leads)
                return None
                
            # Production mode - fetch from API
            leads_list, num_leads = self.fetch_IDs(request=request)
            
            if leads_list is None or num_leads == 0:
                logger.warning("No lead IDs found or error in fetching IDs")
                return None
                
            if not leads_list:
                logger.warning("Empty leads list returned")
                return None

            # Collect multiple leads based on limit
            collected_leads = []
            max_leads_to_fetch = min(limit, len(leads_list), num_leads)
            
            for i in range(max_leads_to_fetch):
                if not leads_list[i]:
                    logger.warning(f"Lead ID at index {i} is empty or invalid")
                    continue
                    
                url = f"https://api.coresignal.com/cdapi/v2/employee_multi_source/collect/{leads_list[i]}"
                headers = {
                    'Content-Type': 'application/json',
                    'apikey': CS_key
                }

                try:
                    enriched_response = requests.get(url, headers=headers, timeout=30)
                    enriched_response.raise_for_status()
                    
                    response_text = enriched_response.text
                    if response_text:
                        # Validate JSON and add to collection
                        lead_data = json.loads(response_text)
                        collected_leads.append(lead_data)
                        
                except Exception as e:
                    logger.error(f"Error fetching lead {i}: {e}")
                    continue
            
            if collected_leads:
                print(f"\nCollected {len(collected_leads)} leads\n")
                return json.dumps(collected_leads)
            else:
                logger.warning("No leads were successfully collected")
                return None

        except Exception as e:
            logger.error(f"Unexpected error in Fetch_Leads: {e}")
            # Return sample leads if in test mode, None otherwise
            if self.test and self.leads:
                logger.info("Returning sample leads due to error in test mode")
                selected_leads = self.leads[:limit] if limit else self.leads
                return json.dumps(selected_leads)
            return None

    def filter_profiles(self, 
                        leads_data: Optional[str] = None,
                        make_keys_descriptive: bool = True,
                        limit_experience_entries: Optional[int] = 3,
                        limit_education_entries: Optional[int] = 3) -> Optional[List[Dict[str, Any]]]:
        """
        Filter profiles for all leads and return as list of filtered profile objects.
        Uses basic filtering which includes: basic info, current role, experience, 
        education, skills, contact, and location.
        
        Args:
            leads_data: JSON string of leads data (if None, uses self.leads or fetches from API)
            make_keys_descriptive: Whether to use descriptive keys instead of technical ones
            limit_experience_entries: Limit number of experience entries (default: 3)
            limit_education_entries: Limit number of education entries (default: 3)
        
        Returns:
            List of filtered profile dictionaries or None on error
        """
        try:
            # Get leads data
            if leads_data:
                # If leads_data is provided as JSON string, parse it
                if isinstance(leads_data, str):
                    all_leads = json.loads(leads_data)
                else:
                    all_leads = leads_data
            elif self.test and self.leads:
                # Use sample leads in test mode
                all_leads = self.leads
            else:
                logger.warning("No leads data available for filtering")
                return None
            
            # Ensure all_leads is a list
            if not isinstance(all_leads, list):
                all_leads = [all_leads]
            
            filtered_profiles = []
            
            # Process each lead
            for i, profile_data in enumerate(all_leads):
                try:
                    filtered_data = {}
                    
                    # Basic Information
                    basic_key = "personal_information" if make_keys_descriptive else "basic_info"
                    filtered_data[basic_key] = {
                        "full_name": profile_data.get("full_name"),
                        "first_name": profile_data.get("first_name"),
                        "last_name": profile_data.get("last_name"),
                        "linkedin_url": profile_data.get("linkedin_url"),
                        "professional_headline": profile_data.get("headline"),
                        "professional_summary": profile_data.get("summary"),
                        "primary_professional_email": profile_data.get("primary_professional_email"),
                        "picture_url":profile_data.get("picture_url")
                    }

                    # Location
                    filtered_data[basic_key]["location"] = {
                        "full_location": profile_data.get("location_full"),
                        "country": profile_data.get("location_country"),
                        "regions": profile_data.get("location_regions", [])
                    }
                    
                    # Contact Information
                    contact_key = "contact_information" if make_keys_descriptive else "contact"
                    filtered_data[contact_key] = {
                        "primary_email": profile_data.get("primary_professional_email"),
                        "professional_network_url": profile_data.get("professional_network_url"),
                        "services_offered": profile_data.get("services")
                    }
                    
                    # If the status is 'matched_pattern', include all matching emails
                    if profile_data.get("primary_professional_email_status") == "matched_pattern":
                        email_collection = profile_data.get("professional_emails_collection", [])
                        filtered_data[contact_key]["matched_emails"] = [
                            d.get("professional_email")
                            for d in email_collection
                            if d.get("professional_email")
                        ]

                    # Current Professional Status
                    current_key = "current_position" if make_keys_descriptive else "current_role"
                    filtered_data[current_key] = {
                        "title": profile_data.get("active_experience_title"),
                        "description": profile_data.get("active_experience_description"),
                        "department": profile_data.get("active_experience_department"),
                        "management_level": profile_data.get("active_experience_management_level"),
                        "is_decision_maker": profile_data.get("is_decision_maker", False),
                        "total_experience_months": profile_data.get("total_experience_duration_months"),
                        "total_experience_years": (profile_data.get("total_experience_duration_months")//12),# Self made
                        "total_experience_remaining_months": (profile_data.get("total_experience_duration_months")%12)# Self made


                    }
                    
                    # Professional Experience
                    if "experience" in profile_data:
                        exp_key = "work_experience" if make_keys_descriptive else "experience"
                        experiences = profile_data["experience"]
                        
                        if limit_experience_entries:
                            experiences = experiences[:limit_experience_entries]
                        
                        filtered_data[exp_key] = []
                        for exp in experiences:
                            formatted_exp = {
                                "position_title": exp.get("position_title"),
                                "company_name": exp.get("company_name"),
                                "company_industry": exp.get("company_industry"),
                                "company_size": exp.get("company_size_range"),
                                "location": exp.get("location"),
                                "duration": f"{exp.get('date_from', '')} - {exp.get('date_to', 'Present')}",
                                "duration_months": exp.get("duration_months"),
                                "department": exp.get("department"),
                                "management_level": exp.get("management_level"),
                                "is_current": bool(exp.get("active_experience", False))
                            }
                            filtered_data[exp_key].append(formatted_exp)
                    
                    # Skills and Expertise
                    skills_key = "skills_and_expertise" if make_keys_descriptive else "skills"
                    filtered_data[skills_key] = {
                        "inferred_skills": profile_data.get("inferred_skills", []),
                        "interests": profile_data.get("interests", [])
                    }
                    
                    # Education
                    if "education" in profile_data:
                        edu_key = "educational_background" if make_keys_descriptive else "education"
                        education = profile_data["education"]
                        
                        if limit_education_entries:
                            education = education[:limit_education_entries]
                        
                        filtered_data[edu_key] = []
                        for edu in education:
                            formatted_edu = {
                                "degree": edu.get("degree"),
                                "institution": edu.get("institution_name"),
                                "location": edu.get("institution_full_address"),
                                "duration": f"{edu.get('date_from_year', '')} - {edu.get('date_to_year', '')}",
                                "description": edu.get("description"),
                                "activities": edu.get("activities_and_societies")
                            }
                            filtered_data[edu_key].append(formatted_edu)
                    
                    # Remove empty values and add profile index for reference
                    cleaned_profile = self.remove_empty_values(filtered_data)
                    cleaned_profile["profile_index"] = i + 1  # Add index for reference
                    
                    filtered_profiles.append(cleaned_profile)
                    
                except Exception as e:
                    logger.error(f"Error filtering profile {i}: {e}")
                    continue
            
            if filtered_profiles:
                logger.info(f"Successfully filtered {len(filtered_profiles)} profiles")
                return filtered_profiles
            else:
                logger.warning("No profiles were successfully filtered")
                return None
                
        except Exception as e:
            logger.error(f"Error in filter_profiles: {e}")
            return None


    def get_filtered_leads(self, 
                    request: LeadSearchRequest, 
                    limit: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Convenience method to fetch leads and filter them in one step.
        
        Args:
            request: LeadSearchRequest object
            limit: Number of leads to fetch and filter
        
        Returns:
            List of filtered lead profile dictionaries or None on error
        """
        try:
            # Step 1: Fetch leads
            raw_leads = self.fetch_leads(request, limit=limit)
            
            if not raw_leads:
                logger.warning("No leads fetched")
                return None
            
            # Step 2: Filter profiles
            filtered_leads = self.filter_profiles(leads_data=raw_leads)
            
            return filtered_leads
            
        except Exception as e:
            logger.error(f"Error in get_filtered_leads: {e}")
            return None


    @staticmethod
    def remove_empty_values(data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively remove keys with empty, None, [], or {} values."""
        if not isinstance(data, dict):
            return data
        
        cleaned = {}
        for k, v in data.items():
            if v in (None, "", [], {}):
                continue
            elif isinstance(v, dict):
                cleaned_dict = LeadFinder.remove_empty_values(v)
                if cleaned_dict:  # Only add if not empty after cleaning
                    cleaned[k] = cleaned_dict
            elif isinstance(v, list):
                # Clean list items if they are dicts
                cleaned_list = []
                for item in v:
                    if isinstance(item, dict):
                        cleaned_item = LeadFinder.remove_empty_values(item)
                        if cleaned_item:
                            cleaned_list.append(cleaned_item)
                    elif item not in (None, "", [], {}):
                        cleaned_list.append(item)
                if cleaned_list:
                    cleaned[k] = cleaned_list
            else:
                cleaned[k] = v
        
        return cleaned