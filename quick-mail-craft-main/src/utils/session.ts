// Enhanced authentication handling with multi-session support

import { API_CONFIG } from '@/config/api';

export interface SessionData {
  sessionId: string;
  isAuthenticated: boolean;
  userEmail?: string;
  profileComplete?: boolean;
  sessionInvalid?: boolean;
  message?: string;
}

// Multi-session support interfaces
interface MultiSessionInfo {
  userEmail: string;
  isActive: boolean;
  timestamp: number;
  profileComplete: boolean;
  userName?: string;
}

interface MultiSessionData {
  [sessionId: string]: MultiSessionInfo;
}

export const SESSION_STORAGE_KEY = 'sessionId';
export const MULTI_SESSION_KEY = 'multiSessionData';
export const AUTH_STATE_KEY = 'authStateId';

// Cache for auth status to prevent excessive API calls
let authStatusCache: {
  data: SessionData | null;
  timestamp: number;
  isLoading: boolean;
} = {
  data: null,
  timestamp: 0,
  isLoading: false
};

const AUTH_CACHE_DURATION = 30000; // 30 seconds cache

// Generate unique auth state for OAuth flow
export const generateAuthState = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `auth_${timestamp}_${random}`;
};

// Store auth state for polling
export const storeAuthState = (authStateId: string): void => {
  localStorage.setItem(AUTH_STATE_KEY, authStateId);
  console.log('######DEBUG##### Stored auth state:', authStateId);
};

// Get stored auth state
export const getAuthState = (): string | null => {
  return localStorage.getItem(AUTH_STATE_KEY);
};

// Clear auth state
export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_STATE_KEY);
};

export const getSessionId = (): string | null => {
  return localStorage.getItem(SESSION_STORAGE_KEY);
};

export const setSessionId = (sessionId: string): void => {
  console.log('Setting session ID:', sessionId);
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
};

export const clearSession = (): void => {
  console.log('Clearing session');
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('tempUserData');
  clearAuthState(); // Also clear auth state
  
  // Clear auth cache when session is cleared
  authStatusCache = {
    data: null,
    timestamp: 0,
    isLoading: false
  };
};

// Multi-session management functions
export const addSession = (sessionId: string, userEmail: string, profileComplete: boolean = false, userName?: string): void => {
  const existingSessions = getMultiSessionData();
  
  // Mark all other sessions as inactive
  Object.keys(existingSessions).forEach(id => {
    existingSessions[id].isActive = false;
  });
  
  // Add new active session
  existingSessions[sessionId] = {
    userEmail,
    isActive: true,
    timestamp: Date.now(),
    profileComplete,
    userName
  };
  
  localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(existingSessions));
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  console.log('Added new session:', sessionId, 'for user:', userEmail);
  
  // Update auth cache with new session info
  authStatusCache = {
    data: {
      sessionId,
      isAuthenticated: true,
      userEmail,
      profileComplete,
      sessionInvalid: false
    },
    timestamp: Date.now(),
    isLoading: false
  };
};

export const getMultiSessionData = (): MultiSessionData => {
  try {
    const data = localStorage.getItem(MULTI_SESSION_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const switchToSession = (sessionId: string): boolean => {
  const sessions = getMultiSessionData();
  
  if (sessions[sessionId]) {
    // Mark all sessions as inactive
    Object.keys(sessions).forEach(id => {
      sessions[id].isActive = false;
    });
    
    // Activate selected session
    sessions[sessionId].isActive = true;
    localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(sessions));
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    console.log('Switched to session:', sessionId);
    return true;
  }
  
  return false;
};

export const getActiveSessionId = (): string | null => {
  const sessions = getMultiSessionData();
  const activeSession = Object.entries(sessions).find(([_, data]) => data.isActive);
  return activeSession ? activeSession[0] : getSessionId();
};

export const removeSession = (sessionId: string): void => {
  const sessions = getMultiSessionData();
  delete sessions[sessionId];
  localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(sessions));
  
  // If removing current session, clear it
  if (getSessionId() === sessionId) {
    clearSession();
  }
  console.log('Removed session:', sessionId);
};

// Cached version of checkAuthStatus to prevent excessive API calls
export const checkAuthStatus = async (forceRefresh: boolean = false): Promise<SessionData> => {
  // Return cached data if available and not expired (unless force refresh)
  if (!forceRefresh && authStatusCache.data && 
      (Date.now() - authStatusCache.timestamp) < AUTH_CACHE_DURATION) {
    console.log('######DEBUG##### Returning cached auth status');
    return authStatusCache.data;
  }
  
  // If already loading, wait for the existing request
  if (authStatusCache.isLoading) {
    console.log('######DEBUG##### Auth check already in progress, waiting...');
    // Wait for the loading to complete
    while (authStatusCache.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return authStatusCache.data || {
      sessionId: '',
      isAuthenticated: false,
      sessionInvalid: true,
      message: 'Authentication check failed'
    };
  }
  
  authStatusCache.isLoading = true;
  
  try {
    const sessionId = getSessionId();
    console.log('######DEBUG##### Checking auth with session ID:', sessionId);
    
    // First attempt: Try with stored session ID
    let response = await fetch(`${API_CONFIG.BASE_URL}/api/check-auth`, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(sessionId && { 'X-Session-ID': sessionId })
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if it's a 401 with session invalid
      if (response.status === 401 && (errorData.session_invalid || errorData.clear_session)) {
        console.log('######DEBUG##### 401 with session invalid, clearing session...');
        clearSession();
        return {
          sessionId: '',
          isAuthenticated: false,
          profileComplete: false,
          sessionInvalid: true,
          message: errorData.message || 'Session expired or invalid. Please authenticate again.'
        };
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();
    console.log('######DEBUG##### Auth check response (with session ID):', data);

    // Check if the session is invalid and needs to be cleared
    if (data.session_invalid || data.clear_session || data.error === 'session_not_found') {
      console.log('######DEBUG##### Session is invalid, clearing stored session...');
      clearSession();
      
      return {
        sessionId: '',
        isAuthenticated: false,
        profileComplete: false,
        sessionInvalid: true,
        message: data.message || 'Session expired or invalid. Please authenticate again.'
      };
    }

    // SECURITY: Don't try without session ID - this was allowing access to other users' sessions
    // Each user must have their own valid session

    // Update multi-session data if authenticated
    if (data.authenticated && data.session_id) {
      addSession(
        data.session_id,
        data.user_info?.email || '',
        data.profile_complete || false,
        data.user_info?.name
      );
    }

    // If still not authenticated, clear any stored session ID
    if (!data.authenticated) {
      clearSession();
    }

    const result = {
      sessionId: data.session_id || sessionId || '',
      isAuthenticated: data.authenticated || false,
      userEmail: data.user_info?.email,
      profileComplete: data.profile_complete || false,
      sessionInvalid: data.session_invalid || false,
      message: data.message
    };
    
    // Cache the result
    authStatusCache = {
      data: result,
      timestamp: Date.now(),
      isLoading: false
    };
    
    return result;
  } catch (error) {
    console.error('######DEBUG##### Error checking auth status:', error);
    authStatusCache.isLoading = false;
    clearSession(); // Clear invalid session on error
    const errorResult = {
      sessionId: '',
      isAuthenticated: false,
      profileComplete: false,
      sessionInvalid: true,
      message: 'Network error. Please try again.'
    };
    
    // Cache the error result briefly to prevent retry storms
    authStatusCache = {
      data: errorResult,
      timestamp: Date.now(),
      isLoading: false
    };
    
    return errorResult;
  }
};

// Function to start authentication
export const startAuthentication = async (): Promise<string> => {
  try {
    console.log('######DEBUG##### Starting authentication...');
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/authenticate-gmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('######DEBUG##### Auth URL received:', data.authorization_url);
    return data.authorization_url;
  } catch (error) {
    console.error('######DEBUG##### Error starting authentication:', error);
    throw error;
  }
};

// Function to handle authentication with popup
export const authenticateWithPopup = async (): Promise<SessionData> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Clear any existing invalid session before starting new auth
      clearSession();
      
      // Get authorization URL
      const authUrl = await startAuthentication();
      
      // Open popup
      const authWindow = window.open(
        authUrl, 
        'auth', 
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!authWindow) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      console.log('######DEBUG##### Popup opened, waiting for auth...');

      // Listen for messages from popup
      const messageListener = (event) => {
        console.log('######DEBUG##### Received message from popup:', event.data);
        
        // Verify origin for security (adjust as needed)
        if (!event.origin.includes('ngrok') && event.origin !== window.location.origin) {
          console.log('######DEBUG##### Message from invalid origin:', event.origin);
          return;
        }
        
        if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
          console.log('######DEBUG##### Auth success received:', event.data);
          
          // Store the session ID from the auth response
          if (event.data.session_id) {
            setSessionId(event.data.session_id);
            console.log('######DEBUG##### Stored session ID from popup:', event.data.session_id);
          }
          
          // Close the popup
          authWindow.close();
          
          // Clean up listener
          window.removeEventListener('message', messageListener);
          
          // Add to multi-session storage
          if (event.data.session_id && event.data.user_info?.email) {
            addSession(
              event.data.session_id,
              event.data.user_info.email,
              !event.data.requires_profile,
              event.data.user_info.name
            );
          }
          
          // Return success data
          resolve({
            sessionId: event.data.session_id || '',
            isAuthenticated: true,
            userEmail: event.data.user_info?.email,
            profileComplete: !event.data.requires_profile,
            sessionInvalid: false,
            message: event.data.message || 'Authentication successful'
          });
          
        } else if (event.data.type === 'GMAIL_AUTH_ERROR') {
          console.error('######DEBUG##### Authentication error:', event.data.error);
          authWindow.close();
          window.removeEventListener('message', messageListener);
          reject(new Error(event.data.error || 'Authentication failed'));
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          console.log('######DEBUG##### Popup was closed manually');
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          
          // Check auth status after popup closes
          checkAuthStatus().then(authData => {
            console.log('######DEBUG##### Auth status after popup close:', authData);
            if (authData.isAuthenticated) {
              resolve(authData);
            } else {
              reject(new Error('Authentication was cancelled or failed'));
            }
          }).catch(error => {
            reject(error);
          });
        }
      }, 1000);
      
    } catch (error) {
      console.error('######DEBUG##### Error in authenticateWithPopup:', error);
      reject(error);
    }
  });
};

// Function to register user with proper session handling
export const registerUser = async (userData: any): Promise<any> => {
  try {
    const sessionId = getSessionId();
    
    if (!sessionId) {
      throw new Error('No session ID available. Please authenticate first.');
    }

    console.log('######DEBUG##### Registering user with session ID:', sessionId);

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Check if the error is due to invalid session
      if (errorData.session_invalid || errorData.clear_session) {
        console.log('######DEBUG##### Session invalid during registration, clearing session...');
        clearSession();
        throw new Error(errorData.message || 'Session expired. Please authenticate again.');
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('######DEBUG##### User registration response:', data);
    
    // Clear session ID after successful registration as user is now permanently stored
    if (data.success && data.profile_complete) {
      clearSession();
    }
    
    return data;
  } catch (error) {
    console.error('######DEBUG##### Error registering user:', error);
    throw error;
  }
};

// Poll auth status using auth state ID
export const pollAuthStatus = async (authStateId: string, maxAttempts: number = 10): Promise<SessionData> => {
  let attempts = 0;
  
  console.log('######DEBUG##### Starting auth status polling for state:', authStateId);
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth-status/${authStateId}`, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`######DEBUG##### Polling attempt ${attempts + 1} response:`, data);
        
        if (data.authenticated && data.session_id) {
          console.log('######DEBUG##### Auth polling successful!');
          
          // Store the session ID
          setSessionId(data.session_id);
          
          // Add to multi-session storage
          if (data.user_info?.email) {
            addSession(
              data.session_id,
              data.user_info.email,
              data.profile_complete || false,
              data.user_info.name
            );
          }
          
          // Clear auth state as it's no longer needed
          clearAuthState();
          
          return {
            sessionId: data.session_id,
            isAuthenticated: true,
            userEmail: data.user_info?.email,
            profileComplete: data.profile_complete || false,
            sessionInvalid: false,
            message: data.message || 'Authentication successful'
          };
        } else if (data.error) {
          console.error('######DEBUG##### Auth polling error:', data.error);
          clearAuthState();
          throw new Error(data.error);
        }
      } else if (response.status === 404) {
        // Auth not completed yet, continue polling
        console.log(`######DEBUG##### Polling attempt ${attempts + 1}: Auth not ready yet`);
      } else {
        console.error(`######DEBUG##### Polling attempt ${attempts + 1} failed with status:`, response.status);
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
    } catch (error) {
      console.error(`######DEBUG##### Auth polling attempt ${attempts + 1} failed:`, error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  clearAuthState();
  throw new Error('Authentication polling timed out. Please try again.');
};

// Enhanced polling verification function
export const checkAuthWithPolling = async (sessionId?: string, maxAttempts: number = 5): Promise<SessionData> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/check-auth`, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(sessionId && { 'X-Session-ID': sessionId })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.authenticated && data.session_id) {
          console.log(`######DEBUG##### Polling verification successful on attempt ${attempts + 1}`);
          
          // Update session if we got a new one
          if (data.session_id !== sessionId) {
            setSessionId(data.session_id);
          }
          
          return {
            sessionId: data.session_id,
            isAuthenticated: true,
            userEmail: data.user_info?.email,
            profileComplete: data.profile_complete || false,
            sessionInvalid: false,
            message: data.message
          };
        }
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      console.log(`######DEBUG##### Polling attempt ${attempts}/${maxAttempts}`);
      
    } catch (error) {
      console.error(`######DEBUG##### Auth check attempt ${attempts + 1} failed:`, error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Authentication verification failed after multiple attempts');
};

// Function to logout
export const logout = async (): Promise<void> => {
  try {
    const sessionId = getSessionId();
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/logout`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(sessionId && { 'X-Session-ID': sessionId })
      }
    });

    // Clear specific session from multi-session storage
    if (sessionId) {
      removeSession(sessionId);
    }

    // Clear current session regardless of response
    clearSession();
    
    console.log('######DEBUG##### Logout completed');
  } catch (error) {
    console.error('######DEBUG##### Error during logout:', error);
    const sessionId = getSessionId();
    if (sessionId) {
      removeSession(sessionId);
    }
    clearSession();
  }
};

// Utility function to handle session validation errors
export const handleSessionError = (error: any): boolean => {
  if (error.message && error.message.includes('Session expired')) {
    console.log('######DEBUG##### Detected session error, clearing session...');
    clearSession();
    return true;
  }
  return false;
};
