import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Save, Loader2, Users, User, Sparkles, Bold, Italic, Underline, List, Link, Type, AlignLeft, AlignCenter, AlignRight, Code, Quote, X, Wand2, Plus, FileText, ArrowLeft } from 'lucide-react';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';
import { toast } from '@/components/ui/sonner';


interface EmailSection {
  id: string;
  name: string;
  emailData: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  };
}

interface EmailData {
  to: string;
  subject: string;
  body: string;
  cc: string;
  bcc: string;
}

interface EmailComposePanelProps {
  emailSections: EmailSection[];
  activeSection: string;
  onEmailDataChange: (field: keyof EmailData, value: string) => void;
  onSaveEmail: (sessionId: string, templateId: string) => void;
  isSaving: boolean;
  onGenerateEmail: () => void;
  onBackToLists?: () => void;
  sessionId?: string;
  templateId?: string;
}

const EmailComposePanel = ({
  emailSections,
  activeSection,
  onEmailDataChange,
  onSaveEmail,
  isSaving,
  onGenerateEmail,
  onBackToLists,
  sessionId = '',
  templateId = ''
}: EmailComposePanelProps) => {
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
    bcc: ''
  };

  const hasGeneratedContent = emailData.subject || emailData.body;






  const isFormValid = () => {
    return emailData.subject.trim() && emailData.body.trim();
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
                  Compose & Save Email
                </h2>
                <p className="text-sm text-gray-500">
                  {currentSection?.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Email Section'}
                </p>
              </div>
            </div>
          </div>
        </div>

      <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white shadow-inner max-h-[85vh] overflow-y-auto">

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

      </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center rounded-b-xl">
          <div className="flex items-center gap-3">
            {onBackToLists && (
              <Button
                onClick={onBackToLists}
                variant="outline"
                className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow-md text-gray-600 hover:text-gray-800 transform hover:scale-[1.02] transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lists
              </Button>
            )}
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
              onClick={() => onSaveEmail(sessionId, templateId)}
              disabled={isSaving || !isFormValid()}
              className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ring-2 ring-gray-500/20 hover:ring-gray-400/40 font-medium px-6 py-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Email
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