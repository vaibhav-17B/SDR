
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface EmailGenerationParams {
  mail_types: string[];
  description: string;
  tone: string;
  additional_requirements: string;
}

interface EmailContent {
  subject: string;
  body: string;
}

interface MultipleEmailGenerationResponse {
  success: boolean;
  message: string;
  generated_emails: { [key: string]: EmailContent };
}

export const useEmailGeneration = (sessionId: string | null, activeSection: string, setEmailSections: any) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const API_BASE_URL = `${API_CONFIG.BASE_URL}`;

  const generateEmailContent = useCallback(async (params: EmailGenerationParams, test: boolean = false) => {
    console.log('######DEBUG##### Starting multiple email generation with params:', params);
    setIsGenerating(true);
    
    const loadingToastId = toast.loading("Generating email content...", {
      description: `Generating ${params.mail_types.length} email(s). This may take a few seconds...`,
    });
    
    try {
      if (test) {
        // Generate mock content for all selected mail types
        const mockGeneratedEmails: { [key: string]: EmailContent } = {};
        
        params.mail_types.forEach(mailType => {
          mockGeneratedEmails[mailType] = {
            subject: `Test ${mailType.replace('_', ' ')} - ${params.tone} Tone`,
            body: `TEST MODE: Mock ${mailType} email content\nTone: ${params.tone}\nDescription: ${params.description}\nAdditional Requirements: ${params.additional_requirements}`
          };
        });

        console.log('######DEBUG##### Mock emails generated:', mockGeneratedEmails);
        
        // Update all email sections with their corresponding generated content
        setEmailSections((prev: any) => prev.map((section: any) => {
          const generatedEmail = mockGeneratedEmails[section.name];
          if (generatedEmail) {
            return {
              ...section,
              emailData: {
                ...section.emailData,
                subject: generatedEmail.subject,
                body: generatedEmail.body
              }
            };
          }
          return section;
        }));

        toast.dismiss(loadingToastId);
        toast.success(`Test emails generated successfully!`, {
          description: `Generated ${params.mail_types.length} mock email(s)`,
          duration: 4000,
        });
      } else {
        // Get session ID from utils
        const currentSessionId = getSessionId();
        
        const requestData = {
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': currentSessionId || sessionId || '',
            'ngrok-skip-browser-warning': 'true'
          },
          payload: params
        };
        
        console.log('######DEBUG##### API Request - Generate Multiple Emails:', requestData);

        const response = await fetch(`${API_BASE_URL}/api/generate-email`, {
          method: 'POST',
          headers: requestData.headers,
          body: JSON.stringify(requestData.payload),
        });

        console.log('######DEBUG##### API Response - Generate Emails Status:', response.status);

        if (!response.ok) {
          throw new Error('Failed to generate emails');
        }

        const result: MultipleEmailGenerationResponse = await response.json();
        console.log('######DEBUG##### API Response - Generate Emails Data:', result);
        
        if (result.success && result.generated_emails) {
          // Update all email sections with their corresponding generated content
          setEmailSections((prev: any) => prev.map((section: any) => {
            const generatedEmail = result.generated_emails[section.name];
            if (generatedEmail) {
              return {
                ...section,
                emailData: {
                  ...section.emailData,
                  subject: generatedEmail.subject,
                  body: generatedEmail.body
                }
              };
            }
            return section;
          }));

          toast.dismiss(loadingToastId);
          toast.success("Email content generated successfully!", {
            description: `Generated ${Object.keys(result.generated_emails).length} email(s). Check each section to review content.`,
            duration: 5000,
          });
        } else {
          throw new Error(result.message || 'Failed to generate emails');
        }
      }
    } catch (error) {
      console.log('######DEBUG##### API Error - Generate Emails:', error);
      toast.dismiss(loadingToastId);
      toast.error("Failed to generate email content. Please try again.", {
        description: "There was an issue with the AI service",
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [API_BASE_URL, sessionId, setEmailSections]);

  return {
    isGenerating,
    generateEmailContent
  };
};
