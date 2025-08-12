
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Mail } from 'lucide-react';

interface EmailGenerationParams {
  mail_types: string[];
  description: string;
  tone: string;
  additional_requirements: string;
}

interface EmailSection {
  id: string;
  name: string;
  emailData: any;
}

interface EmailGenerationFormProps {
  onGenerate: (params: EmailGenerationParams) => void;
  isGenerating: boolean;
  emailSections: EmailSection[];
  activeSection?: string;
}

const EmailGenerationForm = ({ onGenerate, isGenerating, emailSections, activeSection }: EmailGenerationFormProps) => {
  const [params, setParams] = useState<EmailGenerationParams>({
    mail_types: [],
    description: '',
    tone: '',
    additional_requirements: ''
  });

  // Auto-select active template when dialog opens
  useEffect(() => {
    if (activeSection && emailSections.length > 0) {
      const activeTemplate = emailSections.find(section => section.id === activeSection);
      if (activeTemplate) {
        const apiFormat = convertToApiFormat(activeTemplate.name);
        setParams(prev => ({
          ...prev,
          mail_types: prev.mail_types.includes(apiFormat) ? prev.mail_types : [apiFormat]
        }));
      }
    }
  }, [activeSection, emailSections]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (params.tone && params.mail_types.length > 0 && params.description) {
      onGenerate(params);
    }
  };

  // Convert display name to API format
  const convertToApiFormat = (displayName: string): string => {
    const mapping: { [key: string]: string } = {
      'initial_email': 'initial_email',
      'follow_up_1': 'follow_up_1', 
      'follow_up_2': 'follow_up_2',
      'follow_up_3': 'follow_up_3',
      'reply_interested': 'reply_interested',
      'reply_not_interested': 'reply_not_interested',
      'reply_meeting_requested': 'reply_meeting_requested'
    };
    
    // If it's already in API format, return as is
    if (mapping[displayName]) {
      return displayName;
    }
    
    // Convert display format to API format
    return displayName.toLowerCase().replace(/\s+/g, '_');
  };

  const handleMailTypeToggle = (sectionId: string, sectionName: string) => {
    const apiFormat = convertToApiFormat(sectionName);
    const isSelected = params.mail_types.includes(apiFormat);
    if (isSelected) {
      setParams(prev => ({
        ...prev,
        mail_types: prev.mail_types.filter(type => type !== apiFormat)
      }));
    } else {
      setParams(prev => ({
        ...prev,
        mail_types: [...prev.mail_types, apiFormat]
      }));
    }
  };

  const handleSelectAll = () => {
    const allApiFormats = emailSections.map(section => convertToApiFormat(section.name));
    const allSelected = allApiFormats.every(format => params.mail_types.includes(format));
    
    if (allSelected) {
      // Deselect all
      setParams(prev => ({
        ...prev,
        mail_types: []
      }));
    } else {
      // Select all
      setParams(prev => ({
        ...prev,
        mail_types: allApiFormats
      }));
    }
  };


  const isFormValid = params.tone && params.mail_types.length > 0 && params.description;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-lg border border-gray-100">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Template Selection *
          </Label>
          <div className="flex items-center gap-2">
            {params.mail_types.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {params.mail_types.length} selected
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs px-3 py-1 h-auto bg-white hover:bg-gray-50 border-gray-300 text-gray-600 hover:text-gray-800"
            >
              {emailSections.length > 0 && emailSections.map(section => convertToApiFormat(section.name)).every(format => params.mail_types.includes(format)) ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {emailSections.map((section) => {
            const apiFormat = convertToApiFormat(section.name);
            const isSelected = params.mail_types.includes(apiFormat);
            
            return (
              <div
                key={section.id}
                onClick={() => handleMailTypeToggle(section.id, section.name)}
                className={`relative cursor-pointer px-4 py-2 rounded-lg border transition-all duration-200 transform hover:scale-105 flex-shrink-0 ${
                  isSelected
                    ? 'bg-gray-900 border-gray-900 text-white shadow-lg hover:shadow-xl'
                    : 'bg-white border-gray-200 text-gray-700 shadow-md hover:shadow-lg hover:border-gray-400'
                }`}
              >
                <span className="font-medium text-sm whitespace-nowrap">
                  {section.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold text-gray-900">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the main content, purpose, or context for the email..."
          value={params.description}
          onChange={(e) => setParams(prev => ({ ...prev, description: e.target.value }))}
          className={`min-h-[100px] shadow-sm transition-colors duration-200 ${
            params.description.trim() 
              ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
              : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
          }`}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone" className="text-sm font-semibold text-gray-900">Tone *</Label>
        <Select value={params.tone} onValueChange={(value) => setParams(prev => ({ ...prev, tone: value }))}>
          <SelectTrigger className={`shadow-sm transition-colors duration-200 ${
            params.tone 
              ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
              : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
          }`}>
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-xl z-50">
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="persuasive">Persuasive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional_requirements" className="text-sm font-semibold text-gray-900">Additional Requirements</Label>
        <Textarea
          id="additional_requirements"
          placeholder="Any specific requirements, constraints, or special instructions..."
          value={params.additional_requirements}
          onChange={(e) => setParams(prev => ({ ...prev, additional_requirements: e.target.value }))}
          className={`min-h-[80px] shadow-sm transition-colors duration-200 ${
            params.additional_requirements.trim() 
              ? 'bg-[#E8F0FE] border-[#E8F0FE] focus:border-[#E8F0FE] focus:ring-[#E8F0FE]' 
              : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-900'
          }`}
        />
      </div>

      <Button
        type="submit"
        disabled={!isFormValid || isGenerating}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold py-3"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Email...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Email
          </>
        )}
      </Button>
    </form>
  );
};

export default EmailGenerationForm;
