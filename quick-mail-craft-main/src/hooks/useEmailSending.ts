
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';
import { EmailData } from './useEmailSections';

export const useEmailSending = (sessionId: string | null, resetCurrentSection: () => void) => {
  const [isSending, setIsSending] = useState(false);
  const API_BASE_URL = `${API_CONFIG.BASE_URL}`;

  const getDaysFromIntervalType = (intervalType: string, selectedDays: string[]): string[] => {
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    switch (intervalType) {
      case 'daily':
        return allDays;
      case 'exclude-weekends':
        return weekdays;
      case 'specific':
        return selectedDays;
      default:
        return allDays;
    }
  };

  const handleSendEmail = useCallback(async (emailData: EmailData) => {
    console.log('######DEBUG##### Send email clicked with data:', emailData);
    
    if (!emailData.to.trim() || !emailData.subject.trim() || !emailData.body.trim()) {
      toast.error("Please fill in all email fields", {
        description: "To, Subject, and Body are required",
        duration: 3000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
        },
      });
      return;
    }

    if (emailData.includeScheduling && emailData.intervalType === 'specific' && (!emailData.selectedDays || emailData.selectedDays.length === 0)) {
      toast.error("Please select at least one day", {
        description: "Specific days interval requires at least one day selected",
        duration: 3000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
        },
      });
      return;
    }

    setIsSending(true);
    
    const sendingToastId = toast.loading("Sending email...", {
      description: "Please wait while we send your email",
    });
    
    try {
      const emailAddresses = emailData.to
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      const ccAddresses = emailData.cc
        ? emailData.cc.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : null;
      
      const bccAddresses = emailData.bcc
        ? emailData.bcc.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : null;
      
      console.log('######DEBUG##### Parsed email addresses:', {
        to: emailAddresses,
        cc: ccAddresses,
        bcc: bccAddresses
      });

      const payload: any = {
        to: emailAddresses,
        subject: emailData.subject,
        body: emailData.body,
        sender: 'me',
        cc: ccAddresses,
        bcc: bccAddresses,
      };

      // Only include scheduling data if checkbox is checked
      if (emailData.includeScheduling) {
        const intervalDays = getDaysFromIntervalType(emailData.intervalType, emailData.selectedDays);
        payload.interval = {
          type: emailData.intervalType,
          days: intervalDays
        };
        payload.time = emailData.time || '09:00';
        payload.timezone = emailData.timezone || 'UTC';
      }

      // Get session ID from utils
      const currentSessionId = getSessionId();

      const requestData = {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': currentSessionId || sessionId || '',
          'ngrok-skip-browser-warning': 'true'
        },
        payload
      };

      console.log('######DEBUG##### API Request - Send Email:', requestData);

      const response = await fetch(`${API_BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: requestData.headers,
        body: JSON.stringify(requestData.payload),
      });

      console.log('######DEBUG##### API Response - Send Email Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('######DEBUG##### API Error Response:', errorData);
        throw new Error(errorData.detail || 'Failed to send email');
      }

      const result = await response.json();
      console.log('######DEBUG##### API Response - Send Email Data:', result);
      
      toast.dismiss(sendingToastId);
      toast.success(`Email sent successfully!`, {
        description: `${result.successful_sends} emails sent to ${emailAddresses.length} recipients`,
        duration: 5000,
        style: {
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          color: '#16a34a',
        },
      });
      
      if (result.failed_sends > 0) {
        toast.warning(`${result.failed_sends} emails failed to send`, {
          description: "Check the console for details",
          duration: 5000,
          style: {
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            color: '#92400e',
          },
        });
      }
      
      resetCurrentSection();
    } catch (error) {
      console.log('######DEBUG##### API Error - Send Email:', error);
      toast.dismiss(sendingToastId);
      toast.error("Failed to send email. Please try again.", {
        description: error instanceof Error ? error.message : "Check your connection and authentication status",
        duration: 5000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
        },
      });
    } finally {
      setIsSending(false);
    }
  }, [API_BASE_URL, sessionId, resetCurrentSection, getDaysFromIntervalType]);

  return {
    isSending,
    handleSendEmail
  };
};
