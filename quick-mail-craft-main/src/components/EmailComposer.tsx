
import React, { useState, useCallback } from 'react';
import { toast } from '@/components/ui/sonner';
import EmailComposerMain from './EmailComposerMain';
import EmailGenerationDialog from './EmailGenerationDialog';
import EmailComposeDialog from './EmailComposeDialog';
import GmailAuth from './GmailAuth';
import { useEmailSections } from '@/hooks/useEmailSections';
import { useEmailGeneration } from '@/hooks/useEmailGeneration';
import { useEmailSending } from '@/hooks/useEmailSending';

interface EmailGenerationParams {
  tone: string;
  type: string;
  painPoints: string;
  additionalRequirements: string;
}

const EmailComposer = () => {
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const {
    emailSections,
    setEmailSections,
    activeSection,
    getCurrentEmailData,
    handleInputChange,
    resetCurrentSection
  } = useEmailSections();

  const { isGenerating, generateEmailContent } = useEmailGeneration(
    sessionId, 
    activeSection, 
    setEmailSections
  );

  const { isSending, handleSendEmail } = useEmailSending(
    sessionId, 
    resetCurrentSection
  );

  const handleAuthChange = useCallback((
    authenticated: boolean, 
    email: string | null, 
    sessionId?: string, 
    needsProfile?: boolean
  ) => {
    console.log('######DEBUG##### Auth state changed:', { authenticated, email, sessionId, needsProfile });
    setIsAuthenticated(authenticated);
    setUserEmail(email);
    if (sessionId) {
      setSessionId(sessionId);
    }
  }, []);

  const handleCreateMail = useCallback(() => {
    console.log('######DEBUG##### Create mail clicked - Auth:', isAuthenticated);
    
    if (!isAuthenticated) {
      toast.error("Please authenticate with Gmail first", {
        description: "Click 'Connect Gmail' to get started",
        duration: 4000,
        style: {
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          color: '#92400e',
        },
      });
      return;
    }

    setIsGenerationDialogOpen(true);
  }, [isAuthenticated]);

  const handleGenerateEmail = useCallback(async (params: EmailGenerationParams, test: boolean = false) => {
    await generateEmailContent(params, test);
    setIsGenerationDialogOpen(false);
    setIsComposeDialogOpen(true);
  }, [generateEmailContent]);

  const handleSendEmailClick = useCallback(async () => {
    const emailData = getCurrentEmailData();
    await handleSendEmail(emailData);
    setIsComposeDialogOpen(false);
  }, [getCurrentEmailData, handleSendEmail]);

  return (
    <div className="space-y-6 shadow-xl hover:shadow-2xl transition-shadow duration-500 rounded-lg p-6 bg-gradient-to-br from-white to-gray-50">
      {/* Hidden Gmail Auth - handles authentication state */}
      <div className="hidden">
        <GmailAuth onAuthChange={handleAuthChange} />
      </div>
      
      <EmailComposerMain onCreateMail={handleCreateMail} />
      
      <EmailGenerationDialog
        isOpen={isGenerationDialogOpen}
        onClose={() => setIsGenerationDialogOpen(false)}
        onGenerate={handleGenerateEmail}
        isGenerating={isGenerating}
      />
      
      <EmailComposeDialog
        isOpen={isComposeDialogOpen}
        onClose={() => setIsComposeDialogOpen(false)}
        emailData={getCurrentEmailData()}
        onEmailDataChange={handleInputChange}
        onSendEmail={handleSendEmailClick}
        isSending={isSending}
      />
    </div>
  );
};

export default EmailComposer;
