
"""
Logging configuration and utilities for SDR application
"""

import os
import logging
import time
from typing import Optional


# Constants
LOGS_DIR = "logs"
SESSION_LOGS_DIR = os.path.join(LOGS_DIR, "sessions")

# Create directories if they don't exist
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

if not os.path.exists(SESSION_LOGS_DIR):
    os.makedirs(SESSION_LOGS_DIR)

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOGS_DIR, 'api_logs.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# Create logger for API operations
api_logger = logging.getLogger('SDR_API')
api_logger.setLevel(logging.INFO)

# Dictionary to store session-specific loggers
session_loggers = {}


def get_user_email_from_session(session_id: str, redis_manager, user_manager, csv_db) -> str:
    """Get user email from session ID using Redis and user manager"""
    if not session_id:
        print(f"DEBUG: No session_id provided")
        return "unknown"
    
    try:
        print(f"DEBUG: Trying to get email for session: {session_id}")
        
        # Try to get session data from Redis
        session_data = redis_manager.get_session_data(session_id)
        print(f"DEBUG: Session data from Redis: {session_data}")
        
        if session_data:
            # Check different possible keys for email
            email_keys = [ 'email']
            for key in email_keys:
                    if isinstance(session_data[key], str) and '@' in session_data[key]:
                        email = session_data[key]
                        print(f"DEBUG: Found email in {key}: {email}")
                        return email.replace('@', '_at_').replace('.', '_')
                    else:
                        return "_UNKNOWN_"
        
    except Exception as e:
        print(f"DEBUG: Exception in email extraction: {e}")
        api_logger.warning(f"Could not extract user email from session {session_id}: {e}")
    
    print(f"DEBUG: No email found, returning unknown")
    return "unknown"


def get_session_logger(session_id: str, user_email: str = None, redis_manager=None, user_manager=None, csv_db=None):
    """Get or create a session-specific logger with user email in filename"""
    if not session_id:
        return api_logger
    
    # Create a unique key for this session logger
    logger_key = session_id
    
    if logger_key not in session_loggers:
        # Get user email if not provided
        if not user_email:
            user_email = get_user_email_from_session(session_id, redis_manager, user_manager, csv_db)
        else:
            # Sanitize email for filename
            user_email = user_email.replace('@', '_at_').replace('.', '_')
        
        # Create filename with session ID and user email
        session_log_file = os.path.join(SESSION_LOGS_DIR, f"session_{session_id}_{user_email}.log")
        
        # Create a new logger for this session
        session_logger = logging.getLogger(f'SDR_SESSION_{session_id}_{user_email}')
        session_logger.setLevel(logging.INFO)
        
        # Create file handler for this session
        file_handler = logging.FileHandler(session_log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        
        # Add handler to logger
        session_logger.addHandler(file_handler)
        
        # Store in dictionary
        session_loggers[logger_key] = session_logger
        
        # Log session start
        session_logger.info(f"🎯 SESSION STARTED - {session_id} - User: {user_email}")
        api_logger.info(f"🎯 NEW SESSION LOGGER CREATED - {session_id} - User: {user_email}")
    
    return session_loggers[logger_key]


def log_api_start(endpoint_name: str, details: str = "", session_id: str = None, user_email: str = None, 
                  redis_manager=None, user_manager=None, csv_db=None):
    """Log the start of an API endpoint call"""
    message = f"🚀 {endpoint_name} START" + (f" - {details}" if details else "")
    
    # Log to main API logger
    api_logger.info(message)
    
    # Also log to session-specific logger if session_id provided
    if session_id:
        session_logger = get_session_logger(session_id, user_email, redis_manager, user_manager, csv_db)
        session_logger.info(message)


def log_api_success(endpoint_name: str, details: str = "", session_id: str = None, user_email: str = None,
                    redis_manager=None, user_manager=None, csv_db=None):
    """Log successful completion of an API endpoint"""
    message = f"✅ {endpoint_name} SUCCESS" + (f" - {details}" if details else "")
    
    # Log to main API logger
    api_logger.info(message)
    
    # Also log to session-specific logger if session_id provided
    if session_id:
        session_logger = get_session_logger(session_id, user_email, redis_manager, user_manager, csv_db)
        session_logger.info(message)


def log_api_error(endpoint_name: str, error: str, details: str = "", session_id: str = None, user_email: str = None,
                  redis_manager=None, user_manager=None, csv_db=None):
    """Log API endpoint errors"""
    message = f"❌ {endpoint_name} ERROR - {error}" + (f" - {details}" if details else "")
    
    # Log to main API logger
    api_logger.error(message)
    
    # Also log to session-specific logger if session_id provided
    if session_id:
        session_logger = get_session_logger(session_id, user_email, redis_manager, user_manager, csv_db)
        session_logger.error(message)


async def log_requests_middleware(request, call_next, redis_manager=None, user_manager=None, csv_db=None):
    """Request logging middleware"""
    start_time = time.time()
    
    # Extract session ID from headers
    session_id = request.headers.get('X-Session-ID') or request.headers.get('x-session-id')
    
    # Log request details
    api_logger.info(f"🔵 REQUEST START - {request.method} {request.url}")
    api_logger.info(f"   Session ID: {session_id}")
    api_logger.info(f"   Client IP: {request.client.host if request.client else 'Unknown'}")
    
    # Also log to session-specific logger if available
    user_email = None
    if session_id:
        user_email = get_user_email_from_session(session_id, redis_manager, user_manager, csv_db)
        session_logger = get_session_logger(session_id, user_email, redis_manager, user_manager, csv_db)
        session_logger.info(f"🔵 REQUEST - {request.method} {request.url}")
    
    # Get request body if it exists (for POST/PUT requests)
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                # Log first 500 chars of body to avoid huge logs
                body_str = body.decode()[:500]
                if len(body.decode()) > 500:
                    body_str += "... (truncated)"
                api_logger.info(f"   Request Body: {body_str}")
                if session_id:
                    session_logger = get_session_logger(session_id, user_email, redis_manager, user_manager, csv_db)
                    session_logger.info(f"   Request Body: {body_str}")
        except Exception as e:
            api_logger.warning(f"   Could not read request body: {e}")
    
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log response details
    api_logger.info(f"🟢 REQUEST END - {request.method} {request.url}")
    api_logger.info(f"   Status Code: {response.status_code}")
    api_logger.info(f"   Processing Time: {process_time:.4f}s")
    
    # Also log to session-specific logger if available
    if session_id:
        session_logger = get_session_logger(session_id, user_email, redis_manager, user_manager, csv_db)
        session_logger.info(f"🟢 REQUEST END - Status: {response.status_code}, Time: {process_time:.4f}s")
    
    return response