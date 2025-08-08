
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Briefcase, Building, Sparkles, Target, BarChart3 } from 'lucide-react';
import EmailComposePanel from '@/components/EmailComposePanel';
import EmailGenerationDialog from '@/components/EmailGenerationDialog';
import SecondaryNavbar from '@/components/SecondaryNavbar';
import UserProfileSidebar from '@/components/UserProfileSidebar';
import MailCompositionListSelector from '@/components/MailCompositionListSelector';
import { checkAuthStatus, SessionData, clearSession } from '@/utils/session';
import { API_CONFIG } from '@/config/api';
import { useEmailSections, EmailData } from '@/hooks/useEmailSections';
import { useEmailGeneration } from '@/hooks/useEmailGeneration';
import { useEmailSending } from '@/hooks/useEmailSending';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

interface UserData {
  full_name?: string;
  email?: string;
  designation?: string;
  company_name?: string;
  experience?: string;
}

interface MailCompositionList {
  list_id: string;
  list_name: string;
  description?: string;
  created_date: string;
  created_time: string;
  last_updated: string;
  mail_type?: string;
  subject?: string;
  body?: string;
  recipients_count?: number;
  status?: 'draft' | 'completed' | 'sent';
}

interface StudioProps {
  onAuthChange: (authState: any) => void;
}

const Studio = ({ onAuthChange }: StudioProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMailList, setSelectedMailList] = useState<MailCompositionList | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    emailSections,
    setEmailSections,
    activeSection,
    editingName,
    setEditingName,
    addNewSection,
    updateSectionName,
    deleteSection,
    setActiveSection,
    getCurrentEmailData,
    handleInputChange,
    resetCurrentSection
  } = useEmailSections();

  // Email generation and sending hooks
  const { isGenerating, generateEmailContent } = useEmailGeneration(
    sessionData?.sessionId || null,
    activeSection,
    setEmailSections
  );

  const { isSending, handleSendEmail } = useEmailSending(
    sessionData?.sessionId || null,
    resetCurrentSection
  );

  // Dialog state for email generation
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);

  // Mail composition list handlers
  const handleListSelect = async (list: MailCompositionList) => {
    setSelectedMailList(list);
    
    // Load saved templates if they exist
    try {
      if (sessionData?.sessionId) {
        console.log(`📧 Loading templates for list: ${list.list_id}`);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/mail-sessions/${list.list_id}/templates`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'X-Session-ID': sessionData.sessionId
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.list && data.list.templates && Array.isArray(data.list.templates) && data.list.templates.length > 0) {
            console.log(`✅ Found ${data.list.templates.length} saved templates`);
            
            // Map backend templates to frontend email sections
            const loadedSections = data.list.templates.map((template: any, index: number) => {
              // Map backend template IDs to frontend section names and numeric IDs
              let frontendSectionName = template.template_id;
              let numericId = (index + 1).toString(); // Default to sequential numbering
              
              // Map known backend template IDs to their proper positions (first 7 are templates)
              const templateIdMapping: {[key: string]: {id: string, name: string}} = {
                'initial_mail': {id: '1', name: 'initial_email'},
                'follow_up_1': {id: '2', name: 'follow_up_1'},
                'follow_up_2': {id: '3', name: 'follow_up_2'},
                'follow_up_3': {id: '4', name: 'follow_up_3'},
                'reply_interested': {id: '5', name: 'reply_interested'},
                'reply_not_interested': {id: '6', name: 'reply_not_interested'},
                'reply_meeting_requested': {id: '7', name: 'reply_meeting_requested'}
              };
              
              if (templateIdMapping[template.template_id]) {
                numericId = templateIdMapping[template.template_id].id;
                frontendSectionName = templateIdMapping[template.template_id].name;
              } else {
                // For custom templates (follow_up_4, follow_up_5, etc.), generate ID > 7
                numericId = (Date.now() + index).toString(); // Ensure unique ID > 7
                frontendSectionName = template.template_id;
              }
              
              return {
                id: numericId,
                name: frontendSectionName,
                emailData: {
                  to: '',
                  subject: template.subject || '',
                  body: template.body || '',
                  cc: template.cc || '',
                  bcc: template.bcc || ''
                }
              };
            });
            
            // Update email sections with loaded data
            setEmailSections(loadedSections);
            
            // Set first section as active if available
            if (loadedSections.length > 0) {
              setActiveSection(loadedSections[0].id);
            }
            
            toast.success(`Loaded ${loadedSections.length} saved email templates`, {
              duration: 3000
            });
          } else {
            console.log('No saved templates found, starting with clean form');
            // Reset to default sections if no saved templates
            resetToDefaultSections();
          }
        } else {
          console.log('Failed to load templates, starting with clean form');
          resetToDefaultSections();
        }
      }
    } catch (error) {
      console.error('Error loading saved templates:', error);
      toast.error('Failed to load saved templates. Starting with clean form.', {
        duration: 4000
      });
      resetToDefaultSections();
    }
  };

  // Helper function to reset to default sections
  const resetToDefaultSections = () => {
    const defaultSections = [
      {
        id: '1',
        name: 'initial_email',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      },
      {
        id: '2',
        name: 'follow_up_1',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      },
      {
        id: '3',
        name: 'follow_up_2',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      },
      {
        id: '4',
        name: 'follow_up_3',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      },
      {
        id: '5',
        name: 'reply_interested',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      },
      {
        id: '6',
        name: 'reply_not_interested',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      },
      {
        id: '7',
        name: 'reply_meeting_requested',
        emailData: {
          to: '',
          subject: '',
          body: '',
          cc: '',
          bcc: ''
        }
      }
    ];
    
    setEmailSections(defaultSections);
    setActiveSection('1');
  };

  const handleBackToLists = () => {
    setSelectedMailList(null);
    // Reset form data when going back
    resetToDefaultSections();
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Handle selected list from navigation state (from campaigns page)
  useEffect(() => {
    if (location.state?.selectedList) {
      console.log('📧 Selected list from campaigns:', location.state.selectedList);
      handleListSelect(location.state.selectedList);
    }
  }, [location.state?.selectedList]);

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

  // Email generation handlers
  const handleGenerateEmail = async (params: any, test: boolean = false) => {
    await generateEmailContent(params, test);
    setIsGenerationDialogOpen(false);
  };

  const handleSaveEmail = async (sessionId: string, templateId: string) => {
    if (!sessionData?.sessionId) {
      toast.error("Session not found. Please refresh and try again.");
      return;
    }

    if (!selectedMailList?.list_id) {
      toast.error("No mail composition list selected. Please select a list first.");
      return;
    }

    // Get ALL email sections with their data, not just current one
    const allTemplatesData = emailSections.map(section => {
      const sectionName = section.name || '';
      
      // Map frontend section names to backend template IDs  
      let backendTemplateId = '';
      
      // Create reverse mapping from frontend names to backend template IDs
      const frontendToBackendMapping: {[key: string]: string} = {
        'initial_email': 'initial_mail',
        'follow_up_1': 'follow_up_1',
        'follow_up_2': 'follow_up_2', 
        'follow_up_3': 'follow_up_3',
        'reply_interested': 'reply_interested',
        'reply_not_interested': 'reply_not_interested',
        'reply_meeting_requested': 'reply_meeting_requested'
      };
      
      if (frontendToBackendMapping[sectionName]) {
        backendTemplateId = frontendToBackendMapping[sectionName];
      } else {
        // For custom templates (follow_up_4, follow_up_5, etc.), use the section name as-is
        backendTemplateId = sectionName;
      }

      return {
        template_id: backendTemplateId,
        template_name: sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Email Template',
        subject: section.emailData.subject?.trim() || '',
        body: section.emailData.body?.trim() || '',
        cc: section.emailData.cc?.trim() || '',
        bcc: section.emailData.bcc?.trim() || '',
        created_date: new Date().toISOString().split('T')[0],
        last_updated: new Date().toISOString().split('T')[0]
      };
    });

    console.log(`📧 Saving all ${allTemplatesData.length} email templates for list ${selectedMailList.list_id}`);
    console.log('Templates to save:', allTemplatesData);

    setIsSaving(true);
    try {
      // Create new API endpoint call to save all templates at once
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mail-sessions/${selectedMailList.list_id}/templates/batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionData.sessionId
        },
        body: JSON.stringify({
          templates: allTemplatesData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success("All email templates saved successfully!", {
          description: `Saved ${result.templates_count || allTemplatesData.length} email templates to the list.`,
          duration: 3000,
        });
      } else {
        throw new Error('Failed to save email templates');
      }
    } catch (error) {
      console.error('Error saving email:', error);
      toast.error(`Failed to save email templates: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMailList = async (listIdToDelete: string) => {
    if (!sessionData?.sessionId) {
      toast.error("Session not found. Please refresh and try again.");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mail-sessions/${listIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionData.sessionId
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success("Mail composition list deleted successfully!", {
          description: "The list and all its templates have been removed.",
          duration: 3000,
        });
        
        // If we're currently viewing the deleted list, go back to list selector
        if (selectedMailList?.list_id === listIdToDelete) {
          handleBackToLists();
        }
      } else {
        throw new Error('Failed to delete mail session');
      }
    } catch (error) {
      console.error('Error deleting mail session:', error);
      toast.error(`Failed to delete list: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenGenerationDialog = () => {
    if (!sessionData?.isAuthenticated) {
      toast.error("Please authenticate first", {
        description: "You need to be logged in to generate emails",
        duration: 4000,
      });
      return;
    }
    setIsGenerationDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-700">Loading Studio...</p>
        </div>
      </div>
    );
  }

  if (!sessionData?.isAuthenticated || !sessionData?.profileComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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

  // Show mail composition list selector if no list is selected
  if (!selectedMailList) {
    return (
      <MailCompositionListSelector onListSelect={handleListSelect} onDeleteList={handleDeleteMailList} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white rounded-lg">
              <Sparkles className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Email Studio</h1>
              <p className="text-gray-300 text-sm">
                List: {selectedMailList.list_name}
              </p>
            </div>
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
          <div className="bg-white rounded-xl shadow-2xl hover:shadow-3xl transition-shadow duration-300 border border-gray-100 overflow-hidden">
            {/* Workspace Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <BarChart3 className="h-5 w-5 text-gray-900" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Email Composition Workspace</h2>
                </div>
                <Button
                  onClick={handleBackToLists}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                >
                  ← Back to Lists
                </Button>
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
            
            {/* Email Compose Panel */}
            <div className="p-8">
              <EmailComposePanel
                emailSections={emailSections}
                activeSection={activeSection}
                onEmailDataChange={handleInputChange}
                onSaveEmail={handleSaveEmail}
                isSaving={isSaving}
                onGenerateEmail={handleOpenGenerationDialog}
                onBackToLists={handleBackToLists}
                sessionId={selectedMailList?.list_id || ''}
                templateId={activeSection}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Email Generation Dialog */}
      <EmailGenerationDialog
        isOpen={isGenerationDialogOpen}
        onClose={() => setIsGenerationDialogOpen(false)}
        onGenerate={handleGenerateEmail}
        isGenerating={isGenerating}
        emailSections={emailSections}
      />
    </div>
  );
};

export default Studio;
