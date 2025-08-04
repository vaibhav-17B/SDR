
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Briefcase, Building, Sparkles, Target, BarChart3 } from 'lucide-react';
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

  const handleProfileUpdate = async (updatedData: UserData) => {
    // Update the local state immediately to reflect changes
    setUserData(prev => ({
      ...prev,
      ...updatedData,
      full_name: updatedData.full_name || prev?.full_name,
      email: updatedData.email || prev?.email,
      company_name: updatedData.company_name || prev?.company_name,
      designation: updatedData.designation || prev?.designation,
      experience: updatedData.experience || prev?.experience
    }));
    
    // Also force a re-fetch from the API to ensure data consistency
    try {
      const session = await checkAuthStatus();
      if (session.isAuthenticated && session.profileComplete && session.sessionId) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/check-auth`, {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'X-Session-ID': session.sessionId
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
      }
    } catch (error) {
      console.warn('Could not refresh profile data:', error);
      // Keep the immediate update even if API refresh fails
    }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-700">Loading Studio...</p>
        </div>
      </div>
    );
  }

  if (!sessionData?.isAuthenticated || !sessionData?.profileComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Please complete your account setup to access the AI Email Studio.
            </p>
            <a 
              href="/user-info" 
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Setup Account
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white rounded-lg">
              <Sparkles className="h-6 w-6 text-gray-900" />
            </div>
            <h1 className="text-3xl font-bold">AI Email Studio</h1>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl">
            Craft compelling emails with artificial intelligence. Transform your outreach with personalized, 
            professional content generation.
          </p>
        </div>
      </div>

      {/* Profile Overview Section */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="h-5 w-5 text-gray-900" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profile</p>
                    <p className="font-semibold text-gray-900">{userData?.full_name || 'Not provided'}</p>
                    <p className="text-sm text-gray-500">{userData?.email || 'Not connected'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Building className="h-5 w-5 text-gray-900" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Organization</p>
                    <p className="font-semibold text-gray-900">{userData?.company_name || 'Not provided'}</p>
                    <p className="text-sm text-gray-500">{userData?.designation || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Target className="h-5 w-5 text-gray-900" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Experience</p>
                    <p className="font-semibold text-gray-900">{userData?.experience || 'Not provided'}</p>
                    <p className="text-sm text-gray-500">Professional Experience</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Email Composition Workspace */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Workspace Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <BarChart3 className="h-5 w-5 text-gray-900" />
                </div>
                <h2 className="text-2xl font-bold text-white">Email Composition Workspace</h2>
              </div>
              <p className="text-gray-200">
                Create, customize, and send professional emails with AI assistance. 
                Choose from templates or generate custom content.
              </p>
            </div>
            
            {/* Email Campaign Sections Navigation */}
            <div className="bg-gray-50 border-b border-gray-100">
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
            </div>
            
            {/* Email Composer */}
            <div className="p-6">
              <EmailComposer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
