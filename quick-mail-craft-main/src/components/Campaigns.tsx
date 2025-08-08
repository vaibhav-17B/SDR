import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Mail, 
  Linkedin, 
  Globe, 
  Users, 
  Clock, 
  Eye, 
  CheckCircle, 
  Circle,
  ArrowRight,
  ArrowLeft,
  Palette,
  Calendar,
  Send,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Check,
  FileText
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface ProspectsListItem {
  list_id: string;
  list_name: string;
  description: string;
  total_prospects: number;
  prospects: any[];
  tags: string[];
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
  templates_count?: number;
}

interface CampaignData {
  name: string;
  description: string;
  channel: 'email' | 'linkedin' | 'both' | '';
  style: string;
  prospectsListIds: string[];
  selectedProspects: string[];
  scheduling: {
    intervalType: 'daily' | 'specific' | 'exclude-weekends';
    selectedDays: string[];
    time: string;
    timezone: string;
  };
}

const STEPS = [
  { id: 1, name: 'Campaign Info', icon: Target },
  { id: 2, name: 'Channel', icon: Globe },
  { id: 3, name: 'Select Style', icon: Palette },
  { id: 4, name: 'Prospects', icon: Users },
  { id: 5, name: 'Schedule', icon: Clock },
  { id: 6, name: 'Preview', icon: Eye }
];

const STYLE_OPTIONS = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-focused tone' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable tone' },
  { id: 'direct', name: 'Direct', description: 'Straight to the point' },
  { id: 'consultative', name: 'Consultative', description: 'Educational and advisory approach' }
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'Europe/London', label: 'GMT (London)' },
  { value: 'Asia/Kolkata', label: 'IST (India)' },
];

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showComingSoonPopup, setShowComingSoonPopup] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    description: '',
    channel: '',
    style: '',
    prospectsListIds: [],
    selectedProspects: [],
    scheduling: {
      intervalType: 'daily',
      selectedDays: [],
      time: '09:00',
      timezone: 'UTC'
    }
  });
  const [prospectsLists, setProspectsLists] = useState<ProspectsListItem[]>([]);
  const [mailCompositionLists, setMailCompositionLists] = useState<MailCompositionList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMailLists, setIsLoadingMailLists] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  // Fetch actual prospects lists from API
  useEffect(() => {
    fetchProspectsLists();
    fetchMailCompositionLists();
  }, []);

  const fetchProspectsLists = async () => {
    try {
      setIsLoading(true);
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.log('No session ID found for prospects lists');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/prospects-lists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Not authenticated for prospects lists');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.prospects_lists) {
        setProspectsLists(data.prospects_lists);
        console.log(`Loaded ${data.prospects_lists.length} prospects lists for campaigns`);
      }
    } catch (error) {
      console.error('Error fetching prospects lists:', error);
      toast.error('Failed to load prospects lists');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMailCompositionLists = async () => {
    try {
      setIsLoadingMailLists(true);
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.log('No session ID found for mail composition lists');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mail-sessions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Not authenticated for mail composition lists');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.mail_lists) {
        setMailCompositionLists(data.mail_lists);
        console.log(`Loaded ${data.mail_lists.length} mail composition lists for campaigns`);
      }
    } catch (error) {
      console.error('Error fetching mail composition lists:', error);
      toast.error('Failed to load mail composition lists');
    } finally {
      setIsLoadingMailLists(false);
    }
  };

  const handleMailListPreview = (list: MailCompositionList) => {
    // Navigate to Studio page with selected list
    navigate('/studio', { state: { selectedList: list } });
  };

  const handleLinkedInClick = () => {
    setShowComingSoonPopup(true);
  };

  const isStepComplete = (stepId: number): boolean => {
    switch (stepId) {
      case 1:
        return campaignData.name.trim() !== '' && campaignData.description.trim() !== '';
      case 2:
        return campaignData.channel !== '';
      case 3:
        return campaignData.style !== '';
      case 4:
        return campaignData.selectedProspects.length > 0;
      case 5:
        return true; // Scheduling has defaults
      case 6:
        return true; // Preview is always accessible if previous steps are complete
      default:
        return false;
    }
  };

  const canProceedToStep = (stepId: number): boolean => {
    for (let i = 1; i < stepId; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep < STEPS.length && isStepComplete(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateCampaignData = (field: keyof CampaignData | string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCampaignData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof CampaignData],
          [child]: value
        }
      }));
    } else {
      setCampaignData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Helper functions for prospect management
  const getLeadDisplayEmail = (prospect: any) => {
    return prospect.personal_information?.primary_professional_email || 
           prospect.contact_information?.primary_email || 
           prospect.email || 
           'No email available';
  };

  const getLeadDisplayName = (prospect: any) => {
    return prospect.personal_information?.full_name || 'Unknown Name';
  };

  const getLeadCurrentPosition = (prospect: any) => {
    return prospect.current_position?.title || prospect.work_experience?.[0]?.title || 'No position available';
  };

  const getLeadCurrentCompany = (prospect: any) => {
    return prospect.work_experience?.[0]?.company_name || 'No company available';
  };

  const getLeadPhoto = (prospect: any) => {
    return prospect.personal_information?.picture_url;
  };

  const handleListToggle = (listId: string) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
    }
    setExpandedLists(newExpanded);
  };

  const getListSelectionState = (list: ProspectsListItem) => {
    const listEmails = list.prospects.map(p => getLeadDisplayEmail(p));
    const selectedFromThisList = campaignData.selectedProspects.filter(email => listEmails.includes(email));
    
    if (selectedFromThisList.length === 0) return 'none';
    if (selectedFromThisList.length === listEmails.length) return 'all';
    return 'partial';
  };

  const handleListSelect = (listId: string) => {
    const list = prospectsLists.find(l => l.list_id === listId);
    if (!list) return;
    
    const listEmails = list.prospects.map(p => getLeadDisplayEmail(p));
    const allListProspectsSelected = listEmails.every(email => campaignData.selectedProspects.includes(email));
    
    let newSelected;
    if (allListProspectsSelected) {
      newSelected = campaignData.selectedProspects.filter(email => !listEmails.includes(email));
    } else {
      newSelected = [...new Set([...campaignData.selectedProspects, ...listEmails])];
    }
    
    updateCampaignData('selectedProspects', newSelected);
  };

  const handleProspectToggle = (prospectEmail: string) => {
    const newSelected = campaignData.selectedProspects.includes(prospectEmail)
      ? campaignData.selectedProspects.filter(email => email !== prospectEmail)
      : [...campaignData.selectedProspects, prospectEmail];
    
    updateCampaignData('selectedProspects', newSelected);
  };

  const removeSelectedProspect = (email: string) => {
    const newSelected = campaignData.selectedProspects.filter(e => e !== email);
    updateCampaignData('selectedProspects', newSelected);
  };

  const handleDayToggle = (day: string) => {
    const currentDays = campaignData.scheduling.selectedDays;
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateCampaignData('scheduling.selectedDays', updatedDays);
  };

  const createCampaign = async () => {
    setIsLoading(true);
    try {
      // Mock campaign creation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Campaign created successfully!');
      // Reset form or redirect
    } catch (error) {
      toast.error('Failed to create campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Information</h2>
              <p className="text-gray-600">Give your campaign a name and describe its purpose</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name" className="text-sm font-semibold text-gray-900">
                  Campaign Name *
                </Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Q1 2024 Outreach Campaign"
                  value={campaignData.name}
                  onChange={(e) => updateCampaignData('name', e.target.value)}
                  className="w-full h-12 text-base shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-description" className="text-sm font-semibold text-gray-900">
                  Campaign Description *
                </Label>
                <Textarea
                  id="campaign-description"
                  placeholder="Describe your campaign objectives and target audience..."
                  value={campaignData.description}
                  onChange={(e) => updateCampaignData('description', e.target.value)}
                  className="w-full min-h-[120px] shadow-sm"
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Globe className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Channel</h2>
              <p className="text-gray-600">Choose how you want to reach your prospects</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-xl shadow-lg border ${
                  campaignData.channel === 'email' ? 'bg-gray-900 text-white shadow-xl border-gray-900' : 'hover:shadow-xl border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => updateCampaignData('channel', 'email')}
              >
                <CardContent className="p-6 text-center">
                  <Mail className={`w-8 h-8 mx-auto mb-3 ${campaignData.channel === 'email' ? 'text-white' : 'text-gray-900'}`} />
                  <h3 className={`font-semibold mb-2 ${campaignData.channel === 'email' ? 'text-white' : 'text-gray-900'}`}>Email</h3>
                  <p className={`text-sm ${campaignData.channel === 'email' ? 'text-gray-200' : 'text-gray-600'}`}>Send personalized emails to your prospects</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all duration-200 hover:shadow-xl shadow-lg opacity-70 border-gray-200"
                onClick={handleLinkedInClick}
              >
                <CardContent className="p-6 text-center relative">
                  <Linkedin className="w-8 h-8 mx-auto mb-3 text-gray-900" />
                  <h3 className="font-semibold text-gray-900 mb-2">LinkedIn</h3>
                  <p className="text-sm text-gray-600">Connect via LinkedIn messages</p>
                  <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-gray-200 text-gray-700">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all duration-200 hover:shadow-xl shadow-lg opacity-70 border-gray-200"
                onClick={handleLinkedInClick}
              >
                <CardContent className="p-6 text-center relative">
                  <div className="flex justify-center items-center gap-1 mb-3">
                    <Mail className="w-6 h-6 text-gray-900" />
                    <span className="text-gray-400 font-bold">+</span>
                    <Linkedin className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Both</h3>
                  <p className="text-sm text-gray-600">Multi-channel approach for maximum reach</p>
                  <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-gray-200 text-gray-700">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Palette className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Style</h2>
              <p className="text-gray-600">Choose from your existing email templates</p>
            </div>
            
            {isLoadingMailLists ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading your email templates...</p>
              </div>
            ) : mailCompositionLists.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Email Templates Yet</h4>
                <p className="text-gray-600 mb-4">Create your first email template in the Studio</p>
                <Button
                  onClick={() => navigate('/studio')}
                  className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white"
                >
                  Go to Studio
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mailCompositionLists.map((list) => (
                  <Card 
                    key={list.list_id}
                    className={`cursor-pointer transition-all duration-200 shadow-lg border group h-full flex flex-col ${
                      campaignData.style === list.list_id ? 'bg-gray-900 text-white shadow-xl border-gray-900' : 'hover:shadow-xl border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => updateCampaignData('style', list.list_id)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                            campaignData.style === list.list_id ? 'bg-white' : 'bg-gray-100 group-hover:bg-gray-900'
                          }`}>
                            <FileText className={`w-5 h-5 transition-colors duration-300 ${
                              campaignData.style === list.list_id ? 'text-gray-900' : 'text-gray-600 group-hover:text-white'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-semibold line-clamp-1 ${
                              campaignData.style === list.list_id ? 'text-white' : 'text-gray-900 group-hover:text-gray-700'
                            }`}>
                              {list.list_name}
                            </h4>
                            {list.status && (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border mt-1 ${
                                campaignData.style === list.list_id 
                                  ? 'bg-white/20 text-white border-white/30'
                                  : list.status === 'sent' 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : list.status === 'completed' 
                                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {list.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fixed height container for variable content */}
                      <div className="flex-1 mb-4 min-h-[60px] flex flex-col justify-start">
                        {list.description && (
                          <p className={`text-sm line-clamp-2 mb-2 ${
                            campaignData.style === list.list_id ? 'text-gray-200' : 'text-gray-600'
                          }`}>
                            {list.description}
                          </p>
                        )}
                        
                        <div className="mt-auto">
                          <div className={`flex items-center gap-4 text-xs ${
                            campaignData.style === list.list_id ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{list.created_date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{list.created_time}</span>
                            </div>
                          </div>

                          {list.templates_count !== undefined && list.templates_count > 0 && (
                            <div className={`flex items-center gap-1 text-xs mt-1 ${
                              campaignData.style === list.list_id ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              <Mail className="w-3 h-3" />
                              <span>{list.templates_count} templates</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fixed position for button */}
                      <div className="mt-auto pt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMailListPreview(list);
                          }}
                          className={`w-full transition-all duration-300 transform hover:scale-105 ${
                            campaignData.style === list.list_id
                              ? 'bg-white text-gray-900 hover:bg-gray-100 shadow-md hover:shadow-lg'
                              : 'bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Prospects</h2>
              <p className="text-gray-600">Choose specific prospects from your lists for this campaign</p>
            </div>

            {/* Header with Review Lists Option */}
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Prospects *
              </Label>
              <div className="flex items-center gap-3">
                {campaignData.selectedProspects.length > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {campaignData.selectedProspects.length} selected
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/prospects', '_blank')}
                  className="text-xs px-3 py-1 h-7 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Review Lists
                </Button>
              </div>
            </div>

            {/* Selected Prospect Tags */}
            {campaignData.selectedProspects.length > 0 && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-medium text-gray-600">Selected Recipients:</p>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {campaignData.selectedProspects.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100">
                      <span className="text-xs truncate max-w-[150px]">{email}</span>
                      <X 
                        className="w-3 h-3 cursor-pointer text-gray-400 hover:text-red-600 transition-colors" 
                        onClick={() => removeSelectedProspect(email)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading prospects lists...</p>
              </div>
            ) : prospectsLists.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prospects Lists Found</h3>
                <p className="text-gray-600 mb-4">Create prospects lists in the Prospects page to use them in campaigns.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white">
                {prospectsLists.map(list => {
                  const isExpanded = expandedLists.has(list.list_id);
                  const listProspectsCount = list.prospects?.length || 0;
                  const selectionState = getListSelectionState(list);
                  
                  return (
                    <div key={list.list_id} className="space-y-2">
                      <div className={`relative cursor-pointer px-4 py-3 rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md ${
                        selectionState === 'all' 
                          ? 'bg-gray-50 border-gray-300 shadow-md'
                          : selectionState === 'partial'
                          ? 'bg-gray-50 border-gray-300 shadow-md'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleListSelect(list.list_id);
                              }}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                selectionState === 'all' 
                                  ? 'bg-gray-900 border-gray-900' 
                                  : selectionState === 'partial'
                                  ? 'bg-gray-600 border-gray-600'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}>
                                {selectionState === 'all' && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                                {selectionState === 'partial' && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                            </div>
                            <div 
                              onClick={() => handleListToggle(list.list_id)}
                              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            >
                              <Users className="w-5 h-5 flex-shrink-0 text-gray-600" />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-base text-gray-900 truncate block">{list.list_name}</span>
                                <p className="text-sm text-gray-600 truncate mt-1">{list.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                                    {listProspectsCount} prospects
                                  </Badge>
                                  {list.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {selectionState === 'partial' && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {campaignData.selectedProspects.filter(email => list.prospects.map(p => getLeadDisplayEmail(p)).includes(email)).length}/{listProspectsCount}
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-gray-500 ${
                              isExpanded ? 'rotate-180' : ''
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* Individual Prospects */}
                      {isExpanded && (
                        <div className="ml-8 space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                          {list.prospects.map((prospect, index) => {
                            const email = getLeadDisplayEmail(prospect);
                            const name = getLeadDisplayName(prospect);
                            const position = getLeadCurrentPosition(prospect);
                            const company = getLeadCurrentCompany(prospect);
                            const photo = getLeadPhoto(prospect);
                            const isSelected = campaignData.selectedProspects.includes(email);
                            
                            return (
                              <div
                                key={`${list.list_id}-${index}`}
                                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all duration-150 border ${
                                  isSelected
                                    ? 'bg-white border-gray-300 shadow-md'
                                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }`}
                                onClick={() => handleProspectToggle(email)}
                              >
                                {/* Circular Checkbox */}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                                  isSelected 
                                    ? 'bg-gray-900 border-gray-900' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}>
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>

                                {/* Profile Image */}
                                <div className="flex-shrink-0">
                                  {photo ? (
                                    <img
                                      src={photo}
                                      alt={name}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling!.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 ${photo ? 'hidden' : ''}`}>
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                </div>

                                {/* Prospect Details */}
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-sm text-gray-900 truncate">{name}</div>
                                  <div className="text-xs text-gray-600 truncate mt-1">
                                    {position} {company && company !== 'No company available' ? `at ${company}` : ''}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                    {email}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {list.prospects.length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No prospects in this list
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Design Campaign Schedule</h2>
              <p className="text-gray-600">Set when and how often to send your campaign</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-900">Frequency</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="daily" 
                      name="frequency"
                      checked={campaignData.scheduling.intervalType === 'daily'}
                      onChange={() => updateCampaignData('scheduling.intervalType', 'daily')}
                    />
                    <Label htmlFor="daily">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="exclude-weekends" 
                      name="frequency"
                      checked={campaignData.scheduling.intervalType === 'exclude-weekends'}
                      onChange={() => updateCampaignData('scheduling.intervalType', 'exclude-weekends')}
                    />
                    <Label htmlFor="exclude-weekends">Weekdays only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="specific" 
                      name="frequency"
                      checked={campaignData.scheduling.intervalType === 'specific'}
                      onChange={() => updateCampaignData('scheduling.intervalType', 'specific')}
                    />
                    <Label htmlFor="specific">Specific days</Label>
                  </div>
                </div>

                {campaignData.scheduling.intervalType === 'specific' && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Select days:</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <label key={day} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox 
                            checked={campaignData.scheduling.selectedDays.includes(day)}
                            onCheckedChange={() => handleDayToggle(day)}
                          />
                          <span className="text-sm">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-semibold text-gray-900">
                    Send Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={campaignData.scheduling.time}
                    onChange={(e) => updateCampaignData('scheduling.time', e.target.value)}
                    className="w-full shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-sm font-semibold text-gray-900">
                    Timezone
                  </Label>
                  <Select
                    value={campaignData.scheduling.timezone}
                    onValueChange={(value) => updateCampaignData('scheduling.timezone', value)}
                  >
                    <SelectTrigger className="shadow-sm">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        const selectedStyle = STYLE_OPTIONS.find(style => style.id === campaignData.style);
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Preview</h2>
              <p className="text-gray-600">Review your campaign settings before launching</p>
            </div>

            <div className="space-y-6">
              <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Target className="w-5 h-5" />
                    Campaign Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Campaign Name</Label>
                      <p className="font-semibold text-gray-900">{campaignData.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Channel</Label>
                      <div className="flex items-center gap-2">
                        {campaignData.channel === 'email' && <Mail className="w-4 h-4 text-gray-900" />}
                        <span className="font-semibold text-gray-900 capitalize">{campaignData.channel}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Style</Label>
                      <p className="font-semibold text-gray-900">{selectedStyle?.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Prospects</Label>
                      <p className="font-semibold text-gray-900">{campaignData.selectedProspects.length} selected</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="text-gray-900">{campaignData.description}</p>
                  </div>
                  {campaignData.selectedProspects.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Selected Prospects</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {campaignData.selectedProspects.slice(0, 6).map(email => (
                          <Badge key={email} variant="outline" className="text-xs border-gray-400 text-gray-700">
                            {email.length > 25 ? `${email.substring(0, 25)}...` : email}
                          </Badge>
                        ))}
                        {campaignData.selectedProspects.length > 6 && (
                          <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                            +{campaignData.selectedProspects.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Clock className="w-5 h-5" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Frequency</Label>
                      <p className="font-semibold text-gray-900 capitalize">
                        {campaignData.scheduling.intervalType === 'exclude-weekends' ? 'Weekdays only' : campaignData.scheduling.intervalType}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Time & Timezone</Label>
                      <p className="font-semibold text-gray-900">
                        {campaignData.scheduling.time} ({campaignData.scheduling.timezone})
                      </p>
                    </div>
                  </div>
                  {campaignData.scheduling.intervalType === 'specific' && campaignData.scheduling.selectedDays.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-gray-600">Selected Days</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {campaignData.scheduling.selectedDays.map(day => (
                          <Badge key={day} variant="outline" className="border-gray-400 text-gray-700">{day}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white rounded-lg">
              <Target className="h-6 w-6 text-gray-900" />
            </div>
            <h1 className="text-3xl font-bold">Campaign Builder</h1>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl">
            Create and manage targeted outreach campaigns with precision. Build multi-channel strategies 
            to engage your prospects effectively.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Progress Steps */}
        <Card className="mb-8 shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = isStepComplete(step.id);
                const isCurrent = currentStep === step.id;
                const canAccess = canProceedToStep(step.id);
                
                return (
                  <React.Fragment key={step.id}>
                    <div 
                      className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${
                        canAccess ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canAccess && setCurrentStep(step.id)}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-200 shadow-md hover:shadow-lg ${
                        isCurrent 
                          ? 'bg-gray-900 text-white shadow-xl' 
                          : isCompleted 
                          ? 'bg-gray-50 text-gray-900 shadow-lg border-2 border-gray-900' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <span className={`text-sm font-medium text-center ${
                        isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </span>
                    </div>
                    
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 transition-all duration-200 ${
                        isStepComplete(step.id) ? 'bg-gray-900' : 'bg-gray-300'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="mb-8 shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-200">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="shadow-xl hover:shadow-2xl transition-all duration-300 border-gray-300 text-gray-900 hover:bg-gray-50 transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-3">
            {currentStep === STEPS.length ? (
              <Button
                onClick={createCampaign}
                disabled={isLoading || !isStepComplete(currentStep)}
                className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!isStepComplete(currentStep)}
                className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Coming Soon Popup */}
        {showComingSoonPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 shadow-2xl border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="w-6 h-6 text-gray-900" />
                    <CardTitle className="text-xl text-gray-900">Coming Soon!</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComingSoonPopup(false)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  LinkedIn integration is currently in development and will be available soon. 
                  Stay tuned for multi-channel campaign capabilities!
                </p>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setShowComingSoonPopup(false)}
                    className="bg-gray-900 text-white hover:bg-black shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Got it
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;