
import React, { useState, useCallback } from 'react';
import { toast, Toaster } from 'sonner';
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
    <div className="min-h-screen bg-gray-100 p-4">
      <Toaster 
        expand={true}
        richColors={true}
        toastOptions={{
          duration: 0,
          style: {
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
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
    </div>
  );
};

export default EmailComposer;
