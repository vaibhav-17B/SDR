from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any, Union
import pytz

# ============ AUTHENTICATION MODELS ============

class GmailAuthRequest(BaseModel):
    """Request model for Gmail authentication start"""
    auth_state: str

class AuthStatusResponse(BaseModel):
    """Response model for authentication status"""
    authenticated: bool
    profile_complete: bool
    requires_profile: Optional[bool] = None
    session_id: Optional[str] = None
    message: Optional[str] = None
    session_invalid: Optional[bool] = None
    clear_session: Optional[bool] = None
    was_deleted: Optional[bool] = None
    user_info: Optional[Dict[str, Any]] = None

class UserInfo(BaseModel):
    """User information model"""
    name: str
    email: str
    company_name: Optional[str] = None
    designation: Optional[str] = None
    experience: Optional[Union[str, float]] = None

# ============ EMAIL MODELS ============

class EmailSendRequest(BaseModel):
    """Request model for sending emails"""
    to: List[EmailStr]
    subject: str
    body: str
    sender: Optional[str] = "me"
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    interval: Optional[dict] = None  # {type: 'daily', days: ['Monday', 'Tuesday', ...], time: '09:00'}
    time: Optional[str] = Field(None, description="Time in HH:MM format (24-hour)")
    timezone: Optional[str] = Field(None, description="Timezone in IANA format (e.g., 'America/New_York', 'UTC', 'Asia/Kolkata')")

    @field_validator('timezone')
    def validate_timezone(cls, v):
        if v is not None:
            try:
                pytz.timezone(v)
            except pytz.UnknownTimeZoneError:
                raise ValueError(f"Invalid timezone: {v}. Use IANA timezone format (e.g., 'America/New_York', 'UTC', 'Asia/Kolkata')")
        return v

class EmailSendResponse(BaseModel):
    """Response model for email sending"""
    success: bool
    scheduled: Optional[bool] = None
    message: str

class EmailGenerationParams(BaseModel):
    """Request model for email generation"""
    mail_types: List[str]  # List of all mail types
    description: str       # Description as string
    tone: str             # Tone as string
    additional_requirements: str  # Additional requirements as string

class EmailContent(BaseModel):
    """Individual email content model"""
    subject: str
    body: str

class EmailGenerationResponse(BaseModel):
    """Response model for single email generation"""
    subject: str
    body: str
    success: bool

class MultipleEmailGenerationResponse(BaseModel):
    """Response model for multiple email generation"""
    success: bool
    message: str
    generated_emails: Dict[str, EmailContent]  # mail_type -> EmailContent

class RefineEmailRequest(BaseModel):
    """Request model for refining email content"""
    original_subject: str
    original_body: str
    refinement_instructions: str
    mail_type: Optional[str] = None
    tone: Optional[str] = None

# ============ USER MANAGEMENT MODELS ============

class UserData(BaseModel):
    """User profile data model"""
    company_name: str
    designation: str
    experience: float

class UserRegistrationResponse(BaseModel):
    """Response model for user registration"""
    success: bool
    message: str
    authenticated: bool
    profile_complete: bool
    user_info: UserInfo

class UserProfileUpdateRequest(BaseModel):
    """Request model for user profile updates"""
    company_name: str
    designation: str
    experience: float

class UserProfileUpdateResponse(BaseModel):
    """Response model for user profile updates"""
    success: bool
    message: str
    profile_updates: int
    user_info: Dict[str, Any]

class UserDeleteResponse(BaseModel):
    """Response model for user deletion"""
    success: bool
    message: str
    delete_count: int

class UserStats(BaseModel):
    """User statistics model"""
    total_sessions: Optional[int] = None
    last_login: Optional[str] = None
    created_at: Optional[str] = None
    last_updated: Optional[str] = None
    profile_updation_count: Optional[int] = None
    deleted_count: Optional[int] = None

class UserStatsResponse(BaseModel):
    """Response model for user statistics"""
    success: bool
    user_email: str
    stats: UserStats

# ============ LEAD SEARCH MODELS ============

class LeadSearchRequest(BaseModel, frozen=True):
    """Request model for lead search"""
    job_titles: Optional[List[str]] = []
    company_names: Optional[List[str]] = []
    company_domains: Optional[List[str]] = []
    departments: Optional[List[str]] = []
    company_size: Optional[List[str]] = []
    company_revenue: Optional[List[str]] = []
    company_industry: Optional[List[str]] = []
    company_sub_industry: Optional[List[str]] = []
    seniority: Optional[List[str]] = []
    technologies: Optional[List[str]] = []
    countries: Optional[List[str]] = []
    states: Optional[List[str]] = []
    cities: Optional[List[str]] = []

class LeadSearchResponse(BaseModel):
    """Response model for lead search"""
    success: bool
    leads: List[Dict[str, Any]]
    total_count: int
    search_criteria: Dict[str, Any]
    session_id: Optional[str] = None
    search_id: Optional[str] = None

# ============ SEARCH HISTORY MODELS ============

class SearchHistoryItem(BaseModel):
    """Individual search history item model"""
    search_id: str
    search_date: str
    search_time: str
    total_results: int
    search_params: Dict[str, Any]

class SearchHistoryResponse(BaseModel):
    """Response model for search history"""
    success: bool
    user_email: str
    search_history: List[SearchHistoryItem]
    total_searches: int

class SearchByIdResponse(BaseModel):
    """Response model for specific search by ID"""
    success: bool
    search_data: Dict[str, Any]

class SearchDeleteResponse(BaseModel):
    """Response model for search deletion"""
    success: bool
    message: str

# ============ PROSPECTS LIST MODELS ============

class ProspectData(BaseModel):
    """Individual prospect data model"""
    personal_information: Optional[Dict[str, Any]] = None
    current_position: Optional[Dict[str, Any]] = None
    work_experience: Optional[List[Dict[str, Any]]] = None
    educational_background: Optional[List[Dict[str, Any]]] = None
    skills_and_expertise: Optional[Dict[str, Any]] = None
    contact_information: Optional[Dict[str, Any]] = None

class ProspectsListItem(BaseModel):
    """Individual prospects list model"""
    list_id: str
    list_name: str
    description: str
    created_date: str
    created_time: str
    total_prospects: int
    prospects: List[Dict[str, Any]]
    last_updated: str
    tags: List[str]

class ProspectsListResponse(BaseModel):
    """Response model for getting prospects lists"""
    success: bool
    user_email: str
    total_lists: int
    prospects_lists: List[ProspectsListItem]

class CreateProspectsListRequest(BaseModel):
    """Request model for creating prospects list"""
    list_name: str
    description: Optional[str] = ""
    prospects: List[Dict[str, Any]] = []
    tags: Optional[List[str]] = []

class CreateProspectsListResponse(BaseModel):
    """Response model for creating prospects list"""
    success: bool
    list_id: str
    list_name: str
    message: str

class AddProspectsRequest(BaseModel):
    """Request model for adding prospects to list"""
    prospects: List[Dict[str, Any]]

class AddProspectsResponse(BaseModel):
    """Response model for adding prospects to list"""
    success: bool
    list_id: str
    message: str

class ProspectsListByIdResponse(BaseModel):
    """Response model for getting prospects list by ID"""
    success: bool
    prospects_list: ProspectsListItem

class DeleteProspectsListResponse(BaseModel):
    """Response model for deleting prospects list"""
    success: bool
    list_id: str
    message: str

class RemoveProspectResponse(BaseModel):
    """Response model for removing prospect from list"""
    success: bool
    list_id: str
    message: str

class AddCustomLeadRequest(BaseModel):
    """Request model for adding custom lead to list"""
    custom_lead: dict

class AddCustomLeadResponse(BaseModel):
    """Response model for adding custom lead to list"""
    success: bool
    list_id: str
    message: str

# ============ LOGOUT MODEL ============

class LogoutResponse(BaseModel):
    """Response model for logout"""
    message: str
    success: bool

# ============ MAIL SESSIONS MODELS ============

class EmailTemplate(BaseModel):
    """Individual email template model"""
    template_id: str  # e.g., "initial_mail", "follow_up_1", "follow_up_2"
    template_name: str  # e.g., "Initial Outreach", "First Follow-up"
    subject: Optional[str] = None
    body: Optional[str] = None
    cc: Optional[str] = None
    bcc: Optional[str] = None
    created_date: str
    last_updated: str

class MailListTemplates(BaseModel):
    """Complete mail composition list with all email templates"""
    list_id: str
    list_name: str
    description: Optional[str] = None
    created_date: str
    created_time: str
    last_updated: str
    mail_type: Optional[str] = None
    status: Optional[str] = "draft"
    user_email: str
    templates: List[EmailTemplate] = []

class MailCompositionList(BaseModel):
    """Mail composition list metadata model (for CSV)"""
    list_id: str
    list_name: str
    description: Optional[str] = None
    created_date: str
    created_time: str
    last_updated: str
    mail_type: Optional[str] = None
    status: Optional[str] = "draft"
    templates_count: Optional[int] = 0
    json_file_path: Optional[str] = None  # Path to the JSON file containing templates (created on first save)

class CreateMailListRequest(BaseModel):
    """Request model for creating a new mail composition list"""
    list_name: str
    description: Optional[str] = None
    mail_type: Optional[str] = None

class UpdateMailListRequest(BaseModel):
    """Request model for updating a mail composition list"""
    list_id: str
    list_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class UpdateListTemplateRequest(BaseModel):
    """Request model for updating list email templates"""
    template_id: str
    template_name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    cc: Optional[str] = None
    bcc: Optional[str] = None

class MailListsResponse(BaseModel):
    """Response model for mail composition lists"""
    success: bool = True
    mail_lists: List[MailCompositionList]
    total_lists: int
    user_email: Optional[str] = None

class MailListTemplatesResponse(BaseModel):
    """Response model for complete list with templates"""
    success: bool = True
    list: MailListTemplates