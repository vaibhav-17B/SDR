import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, LogIn, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId, setSessionId, clearSession, generateAuthState, storeAuthState, pollAuthStatus } from '@/utils/session';

interface GmailAuthProps {
  onAuthChange: (
    isAuthenticated: boolean, 
    userEmail: string | null, 
    sessionId?: string, 
    needsProfile?: boolean
  ) => void;
}

const GmailAuth = ({ onAuthChange }: GmailAuthProps) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Only check auth status when component first mounts
    // Subsequent checks will be handled by parent components
    checkAuthStatus();
  }, []); // Remove onAuthChange dependency to prevent repeated calls

  const checkAuthStatus = async () => {
    try {
      const savedSessionId = getSessionId();
      
      const requestData = {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
          ...(savedSessionId && { 'X-Session-ID': savedSessionId })
        }
      };

      console.log('######DEBUG##### API Request - Check Auth:', requestData);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/check-auth`, {
        headers: requestData.headers
      });

      console.log('######DEBUG##### API Response - Check Auth Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('######DEBUG##### API Response - Check Auth Data:', data);

        if (data.authenticated) {
          setCurrentSessionId(data.session_id || savedSessionId);
          setIsSignedIn(true);
          setUserEmail(data.user_info?.email || null);
          
          if (data.profile_complete) {
            onAuthChange(true, data.user_info?.email, data.session_id, false);
          } else {
            onAuthChange(true, data.user_info?.email, data.session_id, true);
          }
        } else {
          setIsSignedIn(false);
          setUserEmail(null);
          onAuthChange(false, null);
        }
      }
    } catch (error) {
      console.log('######DEBUG##### API Error - Check Auth:', error);
      setIsSignedIn(false);
      setUserEmail(null);
      onAuthChange(false, null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      // Generate unique auth state for this authentication attempt
      const authStateId = generateAuthState();
      storeAuthState(authStateId);
      
      console.log('######DEBUG##### Generated auth state:', authStateId);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/authenticate-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ auth_state: authStateId })
      });

      console.log('######DEBUG##### API Response - Authenticate Gmail Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('######DEBUG##### API Error - Authenticate Gmail:', errorText);
        toast.error('Failed to start Gmail authentication');
        return;
      }

      const data = await response.json();
      console.log('######DEBUG##### API Response - Authenticate Gmail Data:', data);

      // Open OAuth popup
      const authWindow = window.open(
        data.authorization_url,
        'gmail_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Start polling for auth completion
      console.log('######DEBUG##### Starting auth status polling...');
      
      try {
        const authResult = await pollAuthStatus(authStateId);
        
        // Auth successful!
        console.log('######DEBUG##### Auth completed successfully:', authResult);
        setCurrentSessionId(authResult.sessionId);
        setIsSignedIn(true);
        setUserEmail(authResult.userEmail || null);
        
        // Close popup if still open
        if (!authWindow.closed) {
          authWindow.close();
        }
        
        toast.success('Gmail connected successfully!');
        onAuthChange(
          true, 
          authResult.userEmail, 
          authResult.sessionId, 
          !authResult.profileComplete
        );
        
      } catch (pollError) {
        console.error('######DEBUG##### Auth polling failed:', pollError);
        
        // Close popup if still open
        if (!authWindow.closed) {
          authWindow.close();
        }
        
        toast.error(pollError.message || 'Authentication failed. Please try again.');
      }

    } catch (error) {
      console.log('######DEBUG##### Sign In Error:', error);
      toast.error('Failed to start Gmail authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const requestData = {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId })
        }
      };

      console.log('######DEBUG##### API Request - Logout:', requestData);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/logout`, {
        method: 'DELETE',
        headers: requestData.headers
      });

      console.log('######DEBUG##### API Response - Logout Status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('######DEBUG##### API Response - Logout Data:', responseData);
        
        setIsSignedIn(false);
        setUserEmail(null);
        setCurrentSessionId(null);
        clearSession();
        onAuthChange(false, null);
        toast.success('Signed out successfully');
      } else {
        throw new Error('Failed to sign out');
      }
    } catch (error) {
      console.log('######DEBUG##### Sign Out Error:', error);
      toast.error('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  // Render authentication button when not signed in
  if (!isSignedIn && !isLoading) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-600 mb-4">
          Connect your Gmail account to get started
        </p>
        <Button 
          onClick={handleSignIn} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <Mail className="mr-2 h-4 w-4" />
          {isLoading ? 'Connecting...' : 'Connect Gmail Account'}
        </Button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  // Don't render anything when signed in (UI handled by Navbar)
  return null;
};

export default GmailAuth;
