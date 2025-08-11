import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Settings, Edit3, Trash2, LogOut } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';

interface UserData {
  name?: string;
  email?: string;
  company_name?: string;
  designation?: string;
  experience?: string;
}

interface UserProfileSidebarProps {
  userData: UserData;
  sessionId: string | null;
  onProfileUpdate: (updatedData: UserData) => void;
  onLogout: () => void;
}

interface ProfileFormData {
  company_name: string;
  designation: string;
  experience: string;
}

const UserProfileSidebar = ({ userData, sessionId, onProfileUpdate, onLogout }: UserProfileSidebarProps) => {
  const [showChangeProfileDialog, setShowChangeProfileDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    company_name: userData.company_name || '',
    designation: userData.designation || '',
    experience: userData.experience || ''
  });

  const handleChangeProfile = () => {
    setProfileFormData({
      company_name: userData.company_name || '',
      designation: userData.designation || '',
      experience: userData.experience || ''
    });
    setShowChangeProfileDialog(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId) {
      toast.error('Session expired. Please login again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/change-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify(profileFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const result = await response.json();
      
      // Update local user data
      const updatedUserData = {
        ...userData,
        company_name: profileFormData.company_name,
        designation: profileFormData.designation,
        experience: profileFormData.experience
      };
      
      onProfileUpdate(updatedUserData);
      
      toast.success('Profile updated successfully!');
      setShowChangeProfileDialog(false);
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!sessionId) {
      toast.error('Session expired. Please login again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/delete-profile`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete profile');
      }

      toast.success('Profile deleted successfully!');
      setShowDeleteConfirmDialog(false);
      
      // Logout user after profile deletion
      onLogout();
      
    } catch (error: any) {
      console.error('Profile deletion error:', error);
      toast.error(error.message || 'Failed to delete profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 hover:ring-2 hover:ring-gray-400/40 hover:bg-gray-50">
            <User className="w-4 h-4" />
            <span className="hidden md:inline">{userData.name || userData.email}</span>
            <Settings className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 shadow-xl border border-gray-200">
          <DropdownMenuItem onClick={handleChangeProfile} className="flex items-center space-x-2 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 cursor-pointer">
            <Edit3 className="w-4 h-4" />
            <span>Change Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteConfirmDialog(true)} 
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="flex items-center space-x-2 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Profile Dialog */}
      <Dialog open={showChangeProfileDialog} onOpenChange={setShowChangeProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Your Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={profileFormData.company_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Your Role</Label>
              <Input
                id="designation"
                value={profileFormData.designation}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                value={profileFormData.experience}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowChangeProfileDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Your Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete your profile? This action cannot be undone and you will be logged out.
            </p>
            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowDeleteConfirmDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="default"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Profile'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfileSidebar;