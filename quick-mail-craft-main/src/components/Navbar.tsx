
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Search, User, LogOut, Home } from 'lucide-react';
import UserProfileSidebar from './UserProfileSidebar';
import { checkAuthStatus } from '@/utils/session';
import { API_CONFIG } from '@/config/api';

interface NavbarProps {
  userEmail?: string | null;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

interface UserData {
  name?: string;
  email?: string;
  company_name?: string;
  designation?: string;
  experience?: string;
}

const Navbar = ({ userEmail, isAuthenticated, onSignOut }: NavbarProps) => {
  const location = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && userEmail) {
      fetchUserData();
    } else if (!isAuthenticated) {
      // Clear user data when not authenticated
      setUserData(null);
      setSessionId(null);
    }
  }, [isAuthenticated, userEmail]);

  const fetchUserData = async () => {
    try {
      const session = await checkAuthStatus();
      if (session.isAuthenticated) {
        setSessionId(session.sessionId);
        
        if (session.profileComplete) {
          // Try to get detailed user profile data from check-auth API
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
                  name: data.user_info.name,
                  email: data.user_info.email,
                  company_name: data.user_info.company_name,
                  designation: data.user_info.designation,
                  experience: data.user_info.experience
                });
                return;
              }
            }
          } catch (apiError) {
            console.warn('Could not fetch detailed profile data:', apiError);
          }
        }
        
        // Fallback to basic user data
        setUserData({
          name: userEmail?.split('@')[0] || 'User',
          email: userEmail || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleProfileUpdate = (updatedData: UserData) => {
    setUserData(updatedData);
  };

  const handleLogout = () => {
    setUserData(null);
    setSessionId(null);
    if (onSignOut) {
      onSignOut();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 max-w-none">
          <div className="flex items-center space-x-8 flex-shrink-0">
            <div className="flex-shrink-0 mr-8">
              <Link to="/" className="text-xl font-bold text-gray-900">
                SDR Platform
              </Link>
            </div>
            <div className="flex space-x-4">
              <Link to="/">
                <Button 
                  variant="ghost"
                  className={`flex items-center space-x-2 ${
                    isActive('/') 
                      ? 'bg-gray-900 text-white' 
                      : 'border-gray-300 text-gray-900 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Button>
              </Link>
              <Link to="/prospects">
                <Button 
                  variant="ghost"
                  className={`flex items-center space-x-2 ${
                    isActive('/prospects')
                      ? 'bg-gray-900 text-white' 
                      : 'border-gray-300 text-gray-900 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Prospects</span>
                </Button>
              </Link>
              <Link to="/studio">
                <Button 
                  variant="ghost"
                  className={`flex items-center space-x-2 ${
                    isActive('/studio')
                      ? 'bg-gray-900 text-white' 
                      : 'border-gray-300 text-gray-900 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Studio</span>
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Auth Status in Top Right */}
          <div className="flex items-center flex-shrink-0 ml-auto">
            {isAuthenticated && userEmail && userData ? (
              <UserProfileSidebar 
                userData={userData}
                sessionId={sessionId}
                onProfileUpdate={handleProfileUpdate}
                onLogout={handleLogout}
              />
            ) : (
              <Link to="/user-info">
                <Button 
                  variant="outline"
                  className="border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
