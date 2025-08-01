
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface EmailGenerationParams {
  tone: string;
  type: string;
  painPoints: string;
  additionalRequirements: string;
}

export const useEmailGeneration = (sessionId: string | null, activeSection: string, setEmailSections: any) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const API_BASE_URL = `${API_CONFIG.BASE_URL}`;

  const generateEmailContent = useCallback(async (params: EmailGenerationParams, test: boolean = false) => {
    console.log('######DEBUG##### Starting email generation with params:', params);
    setIsGenerating(true);
    
    const loadingToastId = toast.loading("Generating email content...", {
      description: "This may take a few seconds",
      style: {
        background: '#ede9fe',
        border: '1px solid #c4b5fd',
        color: '#7c3aed',
      },
    });
    
    try {
      if (test) {
        const mockGeneratedContent = {
          subject: `${params.type === 'follow-up' ? 'Follow-up: ' : ''}Test Email - ${params.tone} Tone`,
          body: `TEST MODE: Mock email content based on: ${params.type}, ${params.tone}, ${params.painPoints}`
        };

        console.log('######DEBUG##### Mock email generated:', mockGeneratedContent);
        setEmailSections((prev: any) => prev.map((section: any) => 
          section.id === activeSection 
            ? {
                ...section,
                emailData: {
                  ...section.emailData,
                  subject: mockGeneratedContent.subject,
                  body: mockGeneratedContent.body
                }
              }
            : section
        ));

        toast.dismiss(loadingToastId);
        toast.success("Test email generated successfully!", {
          description: "No API call was made - this is a mock email",
          duration: 4000,
          style: {
            background: '#dbeafe',
            border: '1px solid #93c5fd',
            color: '#1d4ed8',
          },
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
        
        console.log('######DEBUG##### API Request - Generate Email:', requestData);

        const response = await fetch(`${API_BASE_URL}/api/generate-email`, {
          method: 'POST',
          headers: requestData.headers,
          body: JSON.stringify(requestData.payload),
        });

        console.log('######DEBUG##### API Response - Generate Email Status:', response.status);

        if (!response.ok) {
          throw new Error('Failed to generate email');
        }

        const generatedContent = await response.json();
        console.log('######DEBUG##### API Response - Generate Email Data:', generatedContent);
        
        setEmailSections((prev: any) => prev.map((section: any) => 
          section.id === activeSection 
            ? {
                ...section,
                emailData: {
                  ...section.emailData,
                  subject: generatedContent.subject,
                  body: generatedContent.body
                }
              }
            : section
        ));

        toast.dismiss(loadingToastId);
        toast.success("Email content generated successfully!", {
          description: "Your email is ready to review and send",
          duration: 4000,
          style: {
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            color: '#16a34a',
          },
        });
      }
    } catch (error) {
      console.log('######DEBUG##### API Error - Generate Email:', error);
      toast.dismiss(loadingToastId);
      toast.error("Failed to generate email content. Please try again.", {
        description: "There was an issue with the AI service",
        duration: 5000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
        },
      });
    } finally {
      setIsGenerating(false);
    }
  }, [API_BASE_URL, sessionId, activeSection, setEmailSections]);

  return {
    isGenerating,
    generateEmailContent
  };
};
