
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';

interface EmailGenerationParams {
  tone: string;
  type: string;
  painPoints: string;
  additionalRequirements: string;
}

interface EmailGenerationFormProps {
  onGenerate: (params: EmailGenerationParams) => void;
  isGenerating: boolean;
}

const EmailGenerationForm = ({ onGenerate, isGenerating }: EmailGenerationFormProps) => {
  const [params, setParams] = useState<EmailGenerationParams>({
    tone: '',
    type: '',
    painPoints: '',
    additionalRequirements: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (params.tone && params.type && params.painPoints) {
      onGenerate(params);
    }
  };

  const isFormValid = params.tone && params.type && params.painPoints;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tone">Tone of Email *</Label>
        <Select value={params.tone} onValueChange={(value) => setParams(prev => ({ ...prev, tone: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-lg z-50">
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="persuasive">Persuasive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type of Email *</Label>
        <Select value={params.type} onValueChange={(value) => setParams(prev => ({ ...prev, type: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select email type" />
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-lg z-50">
            <SelectItem value="first-time">First Time</SelectItem>
            <SelectItem value="follow-up">Follow Up</SelectItem>
            <SelectItem value="thank-you">Thank You</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="painPoints">Pain Points *</Label>
        <Textarea
          id="painPoints"
          placeholder="Describe the main pain points or challenges to address..."
          value={params.painPoints}
          onChange={(e) => setParams(prev => ({ ...prev, painPoints: e.target.value }))}
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalRequirements">Additional Requirements</Label>
        <Input
          id="additionalRequirements"
          placeholder="Any specific requirements or details..."
          value={params.additionalRequirements}
          onChange={(e) => setParams(prev => ({ ...prev, additionalRequirements: e.target.value }))}
        />
      </div>

      <Button
        type="submit"
        disabled={!isFormValid || isGenerating}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
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
