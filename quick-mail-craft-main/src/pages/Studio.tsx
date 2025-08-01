
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Briefcase, Building } from 'lucide-react';
import EmailComposer from '@/components/EmailComposer';
import SecondaryNavbar from '@/components/SecondaryNavbar';
import UserProfileSidebar from '@/components/UserProfileSidebar';
import { checkAuthStatus, SessionData, clearSession } from '@/utils/session';
import { API_CONFIG } from '@/config/api';
import { useEmailSections } from '@/hooks/useEmailSections';
import { useNavigate } from 'react-router-dom';

interface UserData {
  full_name?: string;
  email?: string;
  designation?: string;
  company_name?: string;
  experience?: string;
}

interface StudioProps {
  onAuthChange: (authState: any) => void;
}

const Studio = ({ onAuthChange }: StudioProps) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    emailSections,
    activeSection,
    editingName,
    setEditingName,
    addNewSection,
    updateSectionName,
    deleteSection,
    setActiveSection
  } = useEmailSections();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Use cached auth check to avoid unnecessary API calls
      const session = await checkAuthStatus();
      setSessionData(session);

      // Update parent component's auth state
      onAuthChange({
        isAuthenticated: session.isAuthenticated,
        userEmail: session.userEmail,
        sessionId: session.sessionId
      });

      if (session.isAuthenticated && session.profileComplete) {
        // Only fetch additional user data if we don't have it cached
        // and only if it's really needed for this component
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/check-auth`, {
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              ...(session.sessionId && { 'X-Session-ID': session.sessionId })
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.user_info) {
              setUserData({
                full_name: data.user_info.name,
                email: data.user_info.email,
                designation: data.user_info.designation,
                company_name: data.user_info.company_name,
                experience: data.user_info.experience
              });
            }
          }
        } catch (userDataError) {
          console.warn('Error fetching detailed user data:', userDataError);
          // Don't fail the whole flow if user details can't be fetched
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = (updatedData: UserData) => {
    setUserData(updatedData);
  };

  const handleLogout = async () => {
    try {
      if (sessionData?.sessionId) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/logout`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'X-Session-ID': sessionData.sessionId
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local session regardless of API response
      clearSession();
      setSessionData(null);
      setUserData(null);
      
      // Update parent component
      onAuthChange({
        isAuthenticated: false,
        userEmail: null,
        sessionId: null
      });
      
      // Navigate to user info page
      navigate('/user-info');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sessionData?.isAuthenticated || !sessionData?.profileComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Please complete your account setup to access the AI Email Composer.
            </p>
            <a 
              href="/user-info" 
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Setup Account
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Profile Section */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Profile Sidebar */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Email Composer Dashboard</h1>

          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>User Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium truncate">{userData?.full_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">Connected Gmail</p>
                    <p className="font-medium truncate">{userData?.email || 'Not connected'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Briefcase className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">Designation</p>
                    <p className="font-medium truncate">{userData?.designation || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Building className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="font-medium truncate">{userData?.company_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Briefcase className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">Experience</p>
                    <p className="font-medium truncate">{userData?.experience || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Campaign Sections Navigation */}
      <SecondaryNavbar
        emailSections={emailSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddSection={addNewSection}
        onUpdateSectionName={updateSectionName}
        onDeleteSection={deleteSection}
        editingName={editingName}
        onEditName={setEditingName}
      />
      
      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <EmailComposer />
        </div>
      </div>
    </div>
  );
};

export default Studio;
