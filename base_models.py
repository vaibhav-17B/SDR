from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional,List,Dict
import pytz

class EmailSendRequest(BaseModel):
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

class EmailGenerationParams(BaseModel):
    tone: str
    type: str
    painPoints: str
    additionalRequirements: str

class UserData(BaseModel):
    company_name: str
    designation: str
    experience: float

class LeadSearchRequest(BaseModel,frozen=True):
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
    # location_preference: Optional[str] = ""
    countries: Optional[List[str]] = []
    states: Optional[List[str]] = []
    cities: Optional[List[str]] = []