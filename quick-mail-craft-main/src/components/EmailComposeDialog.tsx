
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Send, X, Loader2, ChevronDown, Clock } from 'lucide-react';
import EmailInterval from './EmailInterval';

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

interface EmailComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: EmailData;
  onEmailDataChange: (field: keyof EmailData, value: string | string[] | boolean) => void;
  onSendEmail: () => void;
  isSending: boolean;
}

const EmailComposeDialog = ({ 
  isOpen, 
  onClose, 
  emailData, 
  onEmailDataChange, 
  onSendEmail, 
  isSending 
}: EmailComposeDialogProps) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

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
    const basicFieldsValid = emailData.to.trim() && emailData.subject.trim() && emailData.body.trim();
    const intervalValid = !emailData.includeScheduling || 
      emailData.intervalType !== 'specific' || 
      (emailData.selectedDays && emailData.selectedDays.length > 0);
    return basicFieldsValid && intervalValid;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Compose Email
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to" className="text-sm font-medium text-gray-700">
              To *
            </Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com, another@example.com"
              value={emailData.to}
              onChange={(e) => onEmailDataChange('to', e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Separate multiple emails with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc" className="text-sm font-medium text-gray-700">
                CC
              </Label>
              <Input
                id="cc"
                type="email"
                placeholder="cc@example.com"
                value={emailData.cc || ''}
                onChange={(e) => onEmailDataChange('cc', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bcc" className="text-sm font-medium text-gray-700">
                BCC
              </Label>
              <Input
                id="bcc"
                type="email"
                placeholder="bcc@example.com"
                value={emailData.bcc || ''}
                onChange={(e) => onEmailDataChange('bcc', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
              Subject *
            </Label>
            <Input
              id="subject"
              placeholder="Enter email subject"
              value={emailData.subject}
              onChange={(e) => onEmailDataChange('subject', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-sm font-medium text-gray-700">
              Message *
            </Label>
            <Textarea
              id="body"
              placeholder="Enter your message here"
              value={emailData.body}
              onChange={(e) => onEmailDataChange('body', e.target.value)}
              className="w-full min-h-[200px] resize-none font-mono text-sm leading-relaxed"
            />
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
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
                      <Label htmlFor="time" className="text-sm font-medium text-gray-700">
                        Send Time (24-hour format)
                      </Label>
                      <Input
                        id="time"
                        type="time"
                        value={emailData.time || '09:00'}
                        onChange={(e) => onEmailDataChange('time', e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
                        Timezone
                      </Label>
                      <Select
                        value={emailData.timezone || 'UTC'}
                        onValueChange={(value) => onEmailDataChange('timezone', value)}
                      >
                        <SelectTrigger>
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

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end items-center">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={onSendEmail}
              disabled={isSending || !isFormValid()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
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
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposeDialog;
