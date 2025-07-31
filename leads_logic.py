from base_models import UserData, EmailGenerationParams, EmailSendRequest, LeadSearchRequest
from typing import Optional, List, Dict,Tuple
import json
import requests
from dotenv import load_dotenv
import os
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


load_dotenv()
CS_key=os.getenv("CS_API_KEY")

SAMPLE_LEADS = [
    {
        "name": "John Smith",
        "full_name": "John Smith",
        "title": "Senior Software Engineer",
        "email": "john.smith@techcorp.com",
        "email_list": [
            "john.smith@techcorp.com",
            "j.smith@techcorp.com",
            "john@techcorp.com"
        ],
        "organization": "TechCorp Inc",
        "department": "Engineering",
        "location": "San Francisco, CA",
        "experience_years": "5+",
        "skills": ["Python", "React", "AWS", "Docker"],
        "linkedin_profile": "https://linkedin.com/in/johnsmith",
        "phone": "+1-555-0123",
        "bio": "Experienced software engineer with expertise in full-stack development and cloud technologies."
    },
    {
        "name": "Sarah Johnson",
        "full_name": "Sarah Johnson",
        "title": "Product Manager",
        "email": "sarah.johnson@techcorp.com",
        "email_list": [
            "sarah.johnson@techcorp.com",
            "s.johnson@techcorp.com"
        ],
        "organization": "TechCorp Inc",
        "department": "Product",
        "location": "New York, NY",
        "experience_years": "7+",
        "skills": ["Product Strategy", "Agile", "Data Analysis", "UI/UX"],
        "linkedin_profile": "https://linkedin.com/in/sarahjohnson",
        "phone": "+1-555-0124",
        "bio": "Product manager with a track record of launching successful digital products."
    },
    {
        "name": "Michael Chen",
        "full_name": "Michael Chen",
        "title": "DevOps Engineer",
        "email": "michael.chen@techcorp.com",
        "email_list": [
            "michael.chen@techcorp.com",
            "m.chen@techcorp.com",
            "mike.chen@techcorp.com"
        ],
        "organization": "TechCorp Inc",
        "department": "Infrastructure",
        "location": "Seattle, WA",
        "experience_years": "4+",
        "skills": ["Kubernetes", "Terraform", "CI/CD", "Monitoring"],
        "linkedin_profile": "https://linkedin.com/in/michaelchen",
        "phone": "+1-555-0125",
        "bio": "DevOps engineer specializing in cloud infrastructure and automation."
    },
    {
        "name": "Emily Davis",
        "full_name": "Emily Davis",
        "title": "UX Designer",
        "email": "emily.davis@designstudio.com",
        "email_list": [
            "emily.davis@designstudio.com",
            "e.davis@designstudio.com"
        ],
        "organization": "Design Studio",
        "department": "Design",
        "location": "Austin, TX",
        "experience_years": "3+",
        "skills": ["Figma", "User Research", "Prototyping", "Design Systems"],
        "linkedin_profile": "https://linkedin.com/in/emilydavis",
        "phone": "+1-555-0126",
        "bio": "Creative UX designer passionate about creating intuitive user experiences."
    },
    {
        "name": "David Wilson",
        "full_name": "David Wilson",
        "title": "Data Scientist",
        "email": "david.wilson@datatech.com",
        "email_list": [
            "david.wilson@datatech.com",
            "d.wilson@datatech.com",
            "dave@datatech.com"
        ],
        "organization": "DataTech Solutions",
        "department": "Analytics",
        "location": "Boston, MA",
        "experience_years": "6+",
        "skills": ["Python", "Machine Learning", "SQL", "Tableau"],
        "linkedin_profile": "https://linkedin.com/in/davidwilson",
        "phone": "+1-555-0127",
        "bio": "Data scientist with expertise in predictive analytics and machine learning."
    }
]


class LeadFinder:
    def __init__(self, leads: Optional[List[Dict]] = None):
        self.leads = leads or SAMPLE_LEADS


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


    def fetch_leads(self, request: LeadSearchRequest) -> Optional[str]:
        """
        Fetch lead details from CoreSignal API with comprehens
        ive error handling.
        
        Returns:
            Lead data as string or None on error
        """
        try:
            leads_list, num_leads = self.fetch_IDs(request=request)
            
            if leads_list is None or num_leads == 0:
                logger.warning("No lead IDs found or error in fetching IDs")
                return None
                
            if not leads_list:
                logger.warning("Empty leads list returned")
                return None

            if not leads_list[0]:
                logger.error("First lead ID is empty or invalid")
                return None

            url = f"https://api.coresignal.com/cdapi/v2/employee_multi_source/collect/{leads_list[0]}"

            headers = {
                'Content-Type': 'application/json',
                'apikey': CS_key
            }

            try:
                enriched_response = requests.get(
                    url, 
                    headers=headers,
                    timeout=30 
                )
                enriched_response.raise_for_status()  
                
            except requests.exceptions.Timeout:
                logger.error("Request timed out while fetching lead details")
                return None
            except requests.exceptions.ConnectionError:
                logger.error("Connection error while fetching lead details")
                return None
            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP error while fetching lead details: {e}")
                return None
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error while fetching lead details: {e}")
                return None

            try:
                response_text = enriched_response.text
                if not response_text:
                    logger.warning("Empty response received")
                    return None
                    
                json.loads(response_text)
                
                print("\nLead Result: \n")
                self.leads = enriched_response
                return response_text
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in lead response: {e}")
                return None
            except Exception as e:
                logger.error(f"Error processing lead response: {e}")
                return None

        except Exception as e:
            logger.error(f"Unexpected error in Fetch_Leads: {e}")
            return None



    def filter_leads(self,request:LeadSearchRequest) -> List[Dict]:
        filtered_leads = []
        
        for lead in self.leads:
            # Check company name matches
            if request.company_names:
                lead_org = lead.get("organization", "").lower()
                if not any(company.lower() in lead_org for company in request.company_names):
                    continue
            
            # Check job title matches
            if request.job_titles:
                lead_title = lead.get("title", "").lower()
                if not any(title.lower() in lead_title for title in request.job_titles):
                    continue
            
            # Check department matches
            if request.departments:
                lead_dept = lead.get("department", "").lower()
                if not any(dept.lower() in lead_dept for dept in request.departments):
                    continue
            
            # Check skills/technologies matches
            if request.technologies:
                lead_skills = [skill.lower() for skill in lead.get("skills", [])]
                if not any(tech.lower() in lead_skills for tech in request.technologies):
                    continue
            
            # Check location matches
            if request.countries or request.states or request.cities:
                lead_location = lead.get("location", "").lower()
                location_match = False
                
                if request.countries:
                    location_match = any(country.lower() in lead_location for country in request.countries)
                
                if not location_match and request.states:
                    location_match = any(state.lower() in lead_location for state in request.states)
                
                if not location_match and request.cities:
                    location_match = any(city.lower() in lead_location for city in request.cities)
                
                if not location_match:
                    continue
            
            filtered_leads.append(lead)

        # Fallback: return first 3 leads if no filters applied
        if not filtered_leads and not any([
            request.company_names,
            request.job_titles,
            request.departments,
            request.technologies,
            request.countries,
            request.states,
            request.cities
        ]):
            return self.leads[:3]
            
        return filtered_leads