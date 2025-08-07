from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any, Union
import pytz

# ============ COMMON BASE MODELS ============

class SessionIDRequest(BaseModel):
    """Common base model for requests requiring session ID in headers"""
    pass

class IDOnlyRequest(BaseModel):
    """Common base model for requests that only need an ID parameter"""
    pass

class SuccessResponse(BaseModel):
    """Common success response model"""
    success: bool = True
    message: Optional[str] = None

class ErrorResponse(BaseModel):
    """Common error response model"""
    success: bool = False
    error: str
    message: Optional[str] = None

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

# ============ LOGOUT MODEL ============

class LogoutResponse(BaseModel):
    """Response model for logout"""
    message: str
    success: bool