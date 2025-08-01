
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Search, User, LogOut } from 'lucide-react';

interface NavbarProps {
  userEmail?: string | null;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

const Navbar = ({ userEmail, isAuthenticated, onSignOut }: NavbarProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">AI Email App</h1>
            </div>
            <div className="flex space-x-4">
              <Link to="/find-leads">
                <Button 
                  variant={isActive('/find-leads') ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Leads</span>
                </Button>
              </Link>
              <Link to="/">
                <Button 
                  variant={isActive('/') ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>AI Email Composer</span>
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Gmail Auth Status in Top Right */}
          <div className="flex items-center">
            {isAuthenticated && userEmail ? (
              <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700 max-w-[200px] truncate">
                    {userEmail}
                  </span>
                </div>
                <Button
                  onClick={onSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800 px-2"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Not connected
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
