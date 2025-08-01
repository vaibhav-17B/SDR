
import { useState, useCallback } from 'react';

export interface EmailData {
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

export interface EmailSection {
  id: string;
  name: string;
  emailData: EmailData;
}

const getFollowUpName = (count: number): string => {
  if (count === 0) return 'first follow up';
  if (count === 1) return 'second follow up';
  if (count === 2) return 'third follow up';
  if (count === 3) return 'fourth follow up';
  if (count === 4) return 'fifth follow up';
  return `${count + 1}th follow up`;
};

export const useEmailSections = () => {
  const [emailSections, setEmailSections] = useState<EmailSection[]>([
    {
      id: '1',
      name: 'Main Email',
      emailData: {
        to: '',
        subject: '',
        body: '',
        cc: '',
        bcc: '',
        intervalType: 'daily',
        selectedDays: [],
        time: '09:00',
        timezone: 'UTC',
        includeScheduling: false
      }
    }
  ]);
  const [activeSection, setActiveSection] = useState<string>('1');
  const [editingName, setEditingName] = useState<string | null>(null);

  const addNewSection = useCallback(() => {
    // Count existing follow-up sections (excluding the main email)
    const followUpCount = emailSections.filter((section, index) => 
      index > 0 || section.name.toLowerCase().includes('follow up')
    ).length;
    
    const newName = getFollowUpName(followUpCount);

    const newSection: EmailSection = {
      id: Date.now().toString(),
      name: newName,
      emailData: {
        to: '',
        subject: '',
        body: '',
        cc: '',
        bcc: '',
        intervalType: 'daily',
        selectedDays: [],
        time: '09:00',
        timezone: 'UTC',
        includeScheduling: false
      }
    };

    setEmailSections(prev => [...prev, newSection]);
    setActiveSection(newSection.id);
    // Don't auto-start editing - let user click to edit if they want
  }, [emailSections]);

  const updateSectionName = useCallback((id: string, newName: string) => {
    setEmailSections(prev => prev.map(section => 
      section.id === id ? { ...section, name: newName } : section
    ));
    setEditingName(null);
  }, []);

  const deleteSection = useCallback((id: string) => {
    if (emailSections.length <= 1) return;
    
    setEmailSections(prev => prev.filter(section => section.id !== id));
    if (activeSection === id) {
      // Switch to the first available section
      const remainingSections = emailSections.filter(section => section.id !== id);
      setActiveSection(remainingSections[0]?.id || '1');
    }
  }, [emailSections, activeSection]);

  const getCurrentEmailData = useCallback(() => {
    return emailSections.find(section => section.id === activeSection)?.emailData || emailSections[0].emailData;
  }, [emailSections, activeSection]);

  const handleInputChange = useCallback((field: keyof EmailData, value: string | string[] | boolean) => {
    setEmailSections(prev => prev.map(section => 
      section.id === activeSection 
        ? {
            ...section,
            emailData: {
              ...section.emailData,
              [field]: value
            }
          }
        : section
    ));
  }, [activeSection]);

  const resetCurrentSection = useCallback(() => {
    setEmailSections(prev => prev.map(section => 
      section.id === activeSection 
        ? {
            ...section,
            emailData: {
              to: '',
              subject: '',
              body: '',
              cc: '',
              bcc: '',
              intervalType: 'daily',
              selectedDays: [],
              time: '09:00',
              timezone: 'UTC',
              includeScheduling: false
            }
          }
        : section
    ));
  }, [activeSection]);

  return {
    emailSections,
    setEmailSections,
    activeSection,
    setActiveSection,
    editingName,
    setEditingName,
    addNewSection,
    updateSectionName,
    deleteSection,
    getCurrentEmailData,
    handleInputChange,
    resetCurrentSection
  };
};
