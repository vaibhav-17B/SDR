import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GmailAuth from '@/components/GmailAuth';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { addSession, getSessionId, checkAuthStatus, clearSession } from '@/utils/session';

interface UserProfile {
  company_name: string;
  designation: string;
  experience: string;
}

interface UserInfoProps {
  onAuthChange?: (authState: any) => void;
}

const API_BASE_URL = `${API_CONFIG.BASE_URL}`;

const UserInfo = ({ onAuthChange }: UserInfoProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>({
    company_name: '',
    designation: '',
    experience: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const savedSessionId = getSessionId();
    if (savedSessionId) {
      verifySession(savedSessionId);
    }
  }, []);

  const verifySession = async (sessionId: string) => {
    try {
      // Use cached auth check instead of direct API call
      const authData = await checkAuthStatus();
      
      if (authData.isAuthenticated) {
        setSessionId(authData.sessionId);
        setIsAuthenticated(authData.isAuthenticated);
        setUserEmail(authData.userEmail || null);
        
        if (authData.isAuthenticated && !authData.profileComplete) {
          setShowProfileDialog(true);
        } else if (authData.isAuthenticated && authData.profileComplete) {
          // User is fully authenticated, redirect to Home
          navigate('/');
        }
      } else {
        clearSession();
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      clearSession();
    }
  };

  const handleAuthChange = (
    authenticated: boolean, 
    email: string | null, 
    sessionId?: string, 
    needsProfile?: boolean
  ) => {
    console.log('######DEBUG##### UserInfo Auth Change:', { authenticated, email, sessionId, needsProfile });
    setIsAuthenticated(authenticated);
    setUserEmail(email);
    
    if (sessionId && email) {
      setSessionId(sessionId);
      // Use enhanced session management
      addSession(sessionId, email, !needsProfile);
    }
    
    // Notify parent App component about auth change
    if (onAuthChange) {
      onAuthChange({
        isAuthenticated: authenticated,
        userEmail: email,
        sessionId: sessionId,
        profileComplete: !needsProfile
      });
    }
    
    if (needsProfile) {
      setShowProfileDialog(true);
    } else if (authenticated && !needsProfile) {
      navigate('/');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId) {
      toast.error('Session expired. Please reconnect your account.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const requestData = {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'ngrok-skip-browser-warning': 'true'
        },
        payload: profileData
      };

      console.log('######DEBUG##### API Request - Register User:', requestData);

      const response = await fetch(`${API_BASE_URL}/api/register-user`, {
        method: 'POST',
        headers: requestData.headers,
        body: JSON.stringify(requestData.payload)
      });

      console.log('######DEBUG##### API Response - Register User Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('######DEBUG##### API Error - Register User:', errorData);
        throw new Error(errorData.detail || 'Profile completion failed');
      }

      const result = await response.json();
      console.log('######DEBUG##### API Response - Register User Data:', result);
      
      // Update session with profile completion
      if (sessionId && userEmail) {
        addSession(sessionId, userEmail, true, result.user_info?.name);
      }
      
      // Notify parent component (App) about auth state change
      if (onAuthChange && result.user_info) {
        onAuthChange({
          isAuthenticated: true,
          userEmail: result.user_info.email,
          sessionId: sessionId,
          profileComplete: true
        });
      }
      
      toast.success('Profile setup complete!');
      setIsAuthenticated(true);
      setShowProfileDialog(false);
      navigate('/');
    } catch (error: any) {
      console.log('######DEBUG##### Profile Submit Error:', error);
      toast.error(error.message || 'Profile setup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Setup Your Account</CardTitle>
        </CardHeader>
        <CardContent>
          <GmailAuth onAuthChange={handleAuthChange} />
          
          {isAuthenticated && !showProfileDialog && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-800 text-sm">
                Gmail connected successfully! Redirecting to Home...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
          </DialogHeader>
          {/* Show message if user was previously deleted */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-800 text-sm">
              Please complete your profile information to continue using the application.
            </p>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={profileData.company_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, company_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Your Role</Label>
              <Input
                id="designation"
                value={profileData.designation}
                onChange={(e) => setProfileData(prev => ({ ...prev, designation: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                value={profileData.experience}
                onChange={(e) => setProfileData(prev => ({ ...prev, experience: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserInfo;
