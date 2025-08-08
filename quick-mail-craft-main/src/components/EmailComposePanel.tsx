import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Loader2, ChevronDown, Clock, Users, User, Sparkles, Bold, Italic, Underline, List, Link, Type, AlignLeft, AlignCenter, AlignRight, Code, Quote, X, Wand2 } from 'lucide-react';
import EmailInterval from './EmailInterval';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';
import { toast } from '@/components/ui/sonner';

interface Lead {
  [key: string]: any;
  email_list?: string[];
}

interface ProspectsListItem {
  list_id: string;
  list_name: string;
  description: string;
  created_date: string;
  created_time: string;
  total_prospects: number;
  prospects: Lead[];
  last_updated: string;
  tags: string[];
}

interface EmailSection {
  id: string;
  name: string;
  emailData: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    intervalType: 'daily' | 'specific' | 'exclude-weekends';
    selectedDays: string[];
    time: string;
    timezone: string;
    includeScheduling: boolean;
  };
}

interface EmailData {
  to: string;
  subject: string;
  body: string;
  cc: string;
  bcc: string;
  intervalType: 'daily' | 'specific' | 'exclude-weekends';
  selectedDays: string[];
  time: string;
  timezone: string;
  includeScheduling: boolean;
}

interface EmailComposePanelProps {
  emailSections: EmailSection[];
  activeSection: string;
  onEmailDataChange: (field: keyof EmailData, value: string | string[] | boolean) => void;
  onSendEmail: () => void;
  isSending: boolean;
  onGenerateEmail: () => void;
}

const EmailComposePanel = ({
  emailSections,
  activeSection,
  onEmailDataChange,
  onSendEmail,
  isSending,
  onGenerateEmail
}: EmailComposePanelProps) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [prospectsLists, setProspectsLists] = useState<ProspectsListItem[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [showFormattingTools, setShowFormattingTools] = useState(false);
  const [showRefineSection, setShowRefineSection] = useState(false);
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const currentSection = emailSections.find(section => section.id === activeSection);
  const emailData = currentSection?.emailData || {
    to: '',
    subject: '',
    body: '',
    cc: '',
    bcc: '',
    intervalType: 'daily' as const,
    selectedDays: [],
    time: '09:00',
    timezone: 'UTC',
    includeScheduling: false
  };

  const hasGeneratedContent = emailData.subject || emailData.body;

  useEffect(() => {
    fetchProspectsLists();
  }, []);

  const fetchProspectsLists = async () => {
    try {
      setIsLoadingProspects(true);
      const sessionId = getSessionId();
      
      if (!sessionId) {
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

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.prospects_lists) {
          setProspectsLists(data.prospects_lists);
        }
      }
    } catch (error) {
      console.error('Error fetching prospects lists:', error);
    } finally {
      setIsLoadingProspects(false);
    }
  };

  const handleListToggle = (listId: string) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
      // Auto-scroll to show expanded prospects after a short delay
      setTimeout(() => {
        const expandedElement = document.querySelector(`[data-list-id="${listId}"]`);
        if (expandedElement) {
          expandedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 100);
    }
    setExpandedLists(newExpanded);
  };

  const handleListSelect = (listId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const list = prospectsLists.find(l => l.list_id === listId);
    if (!list) return;
    
    const listEmails = list.prospects
      .map(p => getLeadDisplayEmail(p))
      .filter(email => email !== 'No email');
    
    const allListProspectsSelected = listEmails.every(email => selectedProspects.includes(email));
    
    let newSelected;
    if (allListProspectsSelected) {
      newSelected = selectedProspects.filter(email => !listEmails.includes(email));
    } else {
      newSelected = [...new Set([...selectedProspects, ...listEmails])];
    }
    
    setSelectedProspects(newSelected);
    onEmailDataChange('to', newSelected.join(', '));
  };

  const handleProspectToggle = (prospectEmail: string) => {
    const newSelected = selectedProspects.includes(prospectEmail)
      ? selectedProspects.filter(email => email !== prospectEmail)
      : [...selectedProspects, prospectEmail];
    
    setSelectedProspects(newSelected);
    onEmailDataChange('to', newSelected.join(', '));
  };

  const removeSelectedProspect = (emailToRemove: string) => {
    const newSelected = selectedProspects.filter(email => email !== emailToRemove);
    setSelectedProspects(newSelected);
    onEmailDataChange('to', newSelected.join(', '));
  };

  const getListSelectionState = (list: ProspectsListItem) => {
    const listEmails = list.prospects
      .map(p => getLeadDisplayEmail(p))
      .filter(email => email !== 'No email');
    
    if (listEmails.length === 0) return 'none';
    
    const selectedCount = listEmails.filter(email => selectedProspects.includes(email)).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === listEmails.length) return 'all';
    return 'partial';
  };

  const getLeadDisplayEmail = (lead: Lead): string => {
    if (lead.email_list && Array.isArray(lead.email_list) && lead.email_list.length > 0) {
      return lead.email_list[0];
    }
    if (lead.personal_information?.primary_professional_email) {
      return lead.personal_information.primary_professional_email;
    }
    if (lead.contact_information?.primary_email) {
      return lead.contact_information.primary_email;
    }
    if (lead.email && lead.email !== 'undefined' && lead.email !== '') return lead.email;
    if (lead.work_email && lead.work_email !== 'undefined' && lead.work_email !== '') return lead.work_email;
    if (lead.personal_email && lead.personal_email !== 'undefined' && lead.personal_email !== '') return lead.personal_email;
    if (lead.business_email && lead.business_email !== 'undefined' && lead.business_email !== '') return lead.business_email;
    if (lead.company_email && lead.company_email !== 'undefined' && lead.company_email !== '') return lead.company_email;
    return 'No email';
  };

  const getLeadDisplayName = (lead: Lead): string => {
    if (lead.personal_information?.full_name && lead.personal_information.full_name !== 'undefined' && lead.personal_information.full_name !== '') {
      return lead.personal_information.full_name;
    }
    if (lead.full_name && lead.full_name !== 'undefined' && lead.full_name !== '') return lead.full_name;
    if (lead.name && lead.name !== 'undefined' && lead.name !== '') return lead.name;
    
    let firstName = lead.first_name || lead.firstname || lead.personal_information?.first_name || '';
    let lastName = lead.last_name || lead.lastname || lead.personal_information?.last_name || '';
    
    if (firstName && firstName !== 'undefined' && firstName !== '') {
      if (lastName && lastName !== 'undefined' && lastName !== '') {
        return `${firstName} ${lastName}`.trim();
      }
      return firstName;
    }
    
    if (lastName && lastName !== 'undefined' && lastName !== '') {
      return lastName;
    }
    
    if (lead.linkedin_url) return 'LinkedIn Contact';
    if (lead.company_name && lead.company_name !== 'undefined') return `Contact from ${lead.company_name}`;
    if (lead.work_experience?.[0]?.company_name) return `Contact from ${lead.work_experience[0].company_name}`;
    
    return 'Unknown Contact';
  };

  const getLeadPhoto = (lead: Lead): string | undefined => {
    if (lead.personal_information?.picture_url && lead.personal_information.picture_url !== 'undefined' && lead.personal_information.picture_url !== '') {
      return lead.personal_information.picture_url;
    }
    if (lead.photo_url && lead.photo_url !== 'undefined' && lead.photo_url !== '') return lead.photo_url;
    if (lead.profile_pic_url && lead.profile_pic_url !== 'undefined' && lead.profile_pic_url !== '') return lead.profile_pic_url;
    if (lead.linkedin_photo && lead.linkedin_photo !== 'undefined' && lead.linkedin_photo !== '') return lead.linkedin_photo;
    if (lead.avatar_url && lead.avatar_url !== 'undefined' && lead.avatar_url !== '') return lead.avatar_url;
    if (lead.picture_url && lead.picture_url !== 'undefined' && lead.picture_url !== '') return lead.picture_url;
    return undefined;
  };

  const majorTimezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'Europe/London', label: 'GMT (London)' },
    { value: 'Europe/Paris', label: 'CET (Paris)' },
    { value: 'Europe/Moscow', label: 'MSK (Moscow)' },
    { value: 'Asia/Dubai', label: 'GST (Dubai)' },
    { value: 'Asia/Kolkata', label: 'IST (India)' },
    { value: 'Asia/Shanghai', label: 'CST (China)' },
    { value: 'Asia/Tokyo', label: 'JST (Japan)' },
    { value: 'Australia/Sydney', label: 'AEDT (Sydney)' },
  ];

  const handleIntervalTypeChange = (type: 'daily' | 'specific' | 'exclude-weekends') => {
    onEmailDataChange('intervalType', type);
    if (type !== 'specific') {
      onEmailDataChange('selectedDays', []);
    }
  };

  const handleDayToggle = (day: string) => {
    const currentDays = emailData.selectedDays || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    onEmailDataChange('selectedDays', updatedDays);
  };

  const isFormValid = () => {
    const basicFieldsValid = selectedProspects.length > 0 && emailData.subject.trim() && emailData.body.trim();
    const intervalValid = !emailData.includeScheduling || 
      emailData.intervalType !== 'specific' || 
      (emailData.selectedDays && emailData.selectedDays.length > 0);
    return basicFieldsValid && intervalValid;
  };

  const handleSchedulingToggle = (isOpen: boolean) => {
    setShowAdvanced(isOpen);
    if (isOpen) {
      // Auto-scroll to show the scheduling options after a short delay
      setTimeout(() => {
        const schedulingElement = document.querySelector('[data-scheduling-section]');
        if (schedulingElement) {
          schedulingElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 200);
    }
  };

  const handleRefineEmail = async () => {
    if (!emailData.subject.trim() || !emailData.body.trim() || !refinementInstructions.trim()) {
      toast.error('Please provide subject, body, and refinement instructions');
      return;
    }

    setIsRefining(true);
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please refresh and try again.');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/refine-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          original_subject: emailData.subject,
          original_body: emailData.body,
          refinement_instructions: refinementInstructions,
          mail_type: currentSection?.name || 'email',
          tone: 'Professional'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the email data with refined content
        onEmailDataChange('subject', data.subject);
        onEmailDataChange('body', data.body);
        
        toast.success('Email refined successfully!');
        setRefinementInstructions('');
        setShowRefineSection(false);
      } else {
        throw new Error('Failed to refine email');
      }
    } catch (error) {
      console.error('Error refining email:', error);
      toast.error(`Failed to refine email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefining(false);
    }
  };

  if (!hasGeneratedContent) {
    return (
      <div className="space-y-6 shadow-xl hover:shadow-2xl transition-shadow duration-500 rounded-lg p-6 bg-gradient-to-br from-white to-gray-50">
        <div className="flex items-center justify-center min-h-[50vh] p-4">
          <div className="text-center max-w-3xl w-full">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-900 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Email Composer</h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Create AI-powered email content for "{currentSection?.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'this section'}" to get started with email composition
              </p>
            </div>
            
            <div className="mb-6">
              <Button
                onClick={onGenerateEmail}
                className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-10 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate AI Email Content
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-gradient-to-br from-white to-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                <Mail className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Compose & Send Email
                </h2>
                <p className="text-sm text-gray-500">
                  {currentSection?.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Email Section'}
                </p>
              </div>
            </div>
          </div>
        </div>

      <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white shadow-inner max-h-[85vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Prospects *
            </Label>
            {selectedProspects.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {selectedProspects.length} selected
              </span>
            )}
          </div>

          {/* Selected Prospect Tags */}
          {selectedProspects.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Selected Recipients:</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {selectedProspects.map((email) => (
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

          {isLoadingProspects ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Loading prospects...</p>
            </div>
          ) : prospectsLists.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No prospect lists available</p>
              <p className="text-xs text-gray-400 mt-1">Create some prospect lists first</p>
            </div>
          ) : (
            <div 
              className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white"
              style={{ maxHeight: '16rem' }} // Approximately 4 items
            >
              {prospectsLists.map(list => {
                const isExpanded = expandedLists.has(list.list_id);
                const listProspectsCount = list.prospects?.length || 0;
                const selectionState = getListSelectionState(list);
                
                return (
                  <div key={list.list_id} className="space-y-1" data-list-id={list.list_id}>
                    <div className={`relative cursor-pointer px-3 py-2 rounded-lg border transition-all duration-200 ${
                      selectionState === 'all' 
                        ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                        : selectionState === 'partial'
                        ? 'bg-gray-600 border-gray-600 text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => handleListToggle(list.list_id)}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm truncate block">{list.list_name}</span>
                            {list.description && (
                              <p className="text-xs opacity-75 truncate">{list.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => handleListSelect(list.list_id, e)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              selectionState === 'all' 
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : selectionState === 'partial'
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {selectionState === 'all' 
                              ? '✓ All Selected' 
                              : selectionState === 'partial' 
                              ? `${selectedProspects.filter(email => list.prospects.map(p => getLeadDisplayEmail(p)).includes(email)).length}/${listProspectsCount} Selected`
                              : `Select All (${listProspectsCount})`
                            }
                          </button>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </div>
                    </div>

                    {isExpanded && listProspectsCount > 0 && (
                      <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                        {list.prospects.map((prospect, index) => {
                          const email = getLeadDisplayEmail(prospect);
                          const name = getLeadDisplayName(prospect);
                          const photo = getLeadPhoto(prospect);
                          const isSelected = selectedProspects.includes(email);
                          
                          return (
                            <div
                              key={`${list.list_id}-${index}`}
                              onClick={() => email !== 'No email' && handleProspectToggle(email)}
                              className={`relative cursor-pointer px-3 py-2 rounded-md border transition-all duration-200 ${
                                email === 'No email' 
                                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {photo ? (
                                  <img 
                                    src={photo} 
                                    alt={name}
                                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling!.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 ${photo ? 'hidden' : 'flex'}`}>
                                  <User className="w-3 h-3 text-gray-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-xs truncate block">{name}</span>
                                  <p className="text-xs opacity-75 truncate">{email}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isExpanded && listProspectsCount === 0 && (
                      <div className="ml-4 text-center py-3 text-gray-400 text-xs border-l-2 border-gray-100 pl-2">
                        No prospects in this list
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cc" className="text-sm font-semibold text-gray-900">CC</Label>
            <Input
              id="cc"
              type="email"
              placeholder="cc@example.com"
              value={emailData.cc || ''}
              onChange={(e) => onEmailDataChange('cc', e.target.value)}
              className={`w-full shadow-sm transition-colors duration-200 ${
                emailData.cc?.trim() 
                  ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
                  : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
              }`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bcc" className="text-sm font-semibold text-gray-900">BCC</Label>
            <Input
              id="bcc"
              type="email"
              placeholder="bcc@example.com"
              value={emailData.bcc || ''}
              onChange={(e) => onEmailDataChange('bcc', e.target.value)}
              className={`w-full shadow-sm transition-colors duration-200 ${
                emailData.bcc?.trim() 
                  ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
                  : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
              }`}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="subject" className="text-sm font-semibold text-gray-900">Subject *</Label>
          <Input
            id="subject"
            placeholder="Enter email subject"
            value={emailData.subject}
            onChange={(e) => onEmailDataChange('subject', e.target.value)}
            className={`w-full h-12 text-base px-4 py-3 shadow-sm transition-colors duration-200 ${
              emailData.subject.trim() 
                ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
                : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
          />
        </div>

        {/* Refine Email Section */}
        {hasGeneratedContent && (emailData.subject.trim() || emailData.body.trim()) && (
          <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-600" />
                <Label className="text-sm font-semibold text-gray-900">
                  Refine Email Content
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRefineSection(!showRefineSection)}
                className="text-xs px-3 py-1 h-7 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
              >
                {showRefineSection ? 'Hide' : 'Show'} Refine Options
              </Button>
            </div>
            
            {showRefineSection && (
              <div className="space-y-3 pt-2 border-t border-purple-200">
                <div className="space-y-2">
                  <Label htmlFor="refinement-instructions" className="text-sm font-medium text-gray-700">
                    Describe how you'd like to improve the email:
                  </Label>
                  <Textarea
                    id="refinement-instructions"
                    placeholder="e.g., Make it more casual, add urgency, focus on benefits, make it shorter..."
                    value={refinementInstructions}
                    onChange={(e) => setRefinementInstructions(e.target.value)}
                    className="w-full min-h-[80px] text-sm bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleRefineEmail}
                    disabled={isRefining || !refinementInstructions.trim() || !emailData.subject.trim() || !emailData.body.trim()}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-300 text-sm px-4 py-2"
                  >
                    {isRefining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Refining...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Refine Email
                      </>
                    )}
                  </Button>
                  
                  {refinementInstructions.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRefinementInstructions('');
                      }}
                      className="text-sm px-3 py-2 border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                
                <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border border-purple-100">
                  <strong>Tips:</strong> Be specific about changes you want (tone, length, focus, etc.). 
                  The AI will maintain your original message while applying your improvements.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="body" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Message *
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFormattingTools(!showFormattingTools)}
              className="text-xs px-3 py-1 h-7"
            >
              {showFormattingTools ? 'Hide' : 'Show'} Formatting
            </Button>
          </div>
          
          {showFormattingTools && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-white rounded border border-gray-200 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => {
                      const textarea = document.getElementById('body') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = emailData.body.substring(start, end);
                        const newText = emailData.body.substring(0, start) + `**${selectedText}**` + emailData.body.substring(end);
                        onEmailDataChange('body', newText);
                      }
                    }}
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => {
                      const textarea = document.getElementById('body') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = emailData.body.substring(start, end);
                        const newText = emailData.body.substring(0, start) + `*${selectedText}*` + emailData.body.substring(end);
                        onEmailDataChange('body', newText);
                      }
                    }}
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => {
                      const textarea = document.getElementById('body') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = emailData.body.substring(start, end);
                        const newText = emailData.body.substring(0, start) + `<u>${selectedText}</u>` + emailData.body.substring(end);
                        onEmailDataChange('body', newText);
                      }
                    }}
                  >
                    <Underline className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-1 bg-white rounded border border-gray-200 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => {
                      const textarea = document.getElementById('body') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const newText = emailData.body.substring(0, start) + '\n• ' + emailData.body.substring(start);
                        onEmailDataChange('body', newText);
                      }
                    }}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => {
                      const textarea = document.getElementById('body') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = emailData.body.substring(start, end) || 'link text';
                        const newText = emailData.body.substring(0, start) + `[${selectedText}](URL)` + emailData.body.substring(end);
                        onEmailDataChange('body', newText);
                      }
                    }}
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => {
                      const textarea = document.getElementById('body') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = emailData.body.substring(start, end);
                        const newText = emailData.body.substring(0, start) + `> ${selectedText}` + emailData.body.substring(end);
                        onEmailDataChange('body', newText);
                      }
                    }}
                  >
                    <Quote className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const newText = emailData.body + '\n\nBest regards,\n[Your Name]';
                    onEmailDataChange('body', newText);
                  }}
                >
                  Add Signature
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const newText = emailData.body + '\n\nP.S. ';
                    onEmailDataChange('body', newText);
                  }}
                >
                  Add P.S.
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const textarea = document.getElementById('body') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const newText = emailData.body.substring(0, start) + '\n\n---\n\n' + emailData.body.substring(start);
                      onEmailDataChange('body', newText);
                    }
                  }}
                >
                  Add Divider
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                <strong>Quick Tips:</strong> Use **bold**, *italic*, [link](URL), &gt; quote, • bullet points
              </div>
            </div>
          )}
          
          <Textarea
            id="body"
            placeholder="Enter your message here... Use the formatting tools above to enhance your email."
            value={emailData.body}
            onChange={(e) => onEmailDataChange('body', e.target.value)}
            className={`w-full min-h-[350px] resize-y font-sans text-base leading-relaxed shadow-sm transition-colors duration-200 ${
              emailData.body.trim() 
                ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
                : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
          />
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{emailData.body.length} characters, {emailData.body.split(' ').length} words</span>
            <span>Est. read time: {Math.max(1, Math.ceil(emailData.body.split(' ').length / 200))} min</span>
          </div>
        </div>

        <Collapsible open={showAdvanced} onOpenChange={handleSchedulingToggle} data-scheduling-section>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex items-center justify-between"
              type="button"
            >
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Advanced Scheduling
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeScheduling"
                checked={emailData.includeScheduling}
                onCheckedChange={(checked) => onEmailDataChange('includeScheduling', checked as boolean)}
              />
              <Label htmlFor="includeScheduling" className="text-sm font-medium text-gray-700">
                Enable scheduling options
              </Label>
            </div>

            {emailData.includeScheduling && (
              <>
                <div className="border-t pt-4">
                  <EmailInterval
                    intervalType={emailData.intervalType || 'daily'}
                    selectedDays={emailData.selectedDays || []}
                    onIntervalTypeChange={handleIntervalTypeChange}
                    onDayToggle={handleDayToggle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-sm font-semibold text-gray-900">
                      Send Time (24-hour format)
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={emailData.time || '09:00'}
                      onChange={(e) => onEmailDataChange('time', e.target.value)}
                      className={`w-full shadow-sm transition-colors duration-200 ${
                        emailData.time && emailData.time !== '09:00'
                          ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
                          : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-semibold text-gray-900">
                      Timezone
                    </Label>
                    <Select
                      value={emailData.timezone || 'UTC'}
                      onValueChange={(value) => onEmailDataChange('timezone', value)}
                    >
                      <SelectTrigger className={`shadow-sm transition-colors duration-200 ${
                        emailData.timezone && emailData.timezone !== 'UTC'
                          ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
                          : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                      }`}>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {majorTimezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center rounded-b-xl">
          <div className="flex items-center gap-3">
            <Button
              onClick={onGenerateEmail}
              variant="outline"
              className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 text-gray-600 hover:text-gray-800"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate Content
            </Button>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={onSendEmail}
              disabled={isSending || !isFormValid()}
              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-300 font-medium px-6 py-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposePanel;