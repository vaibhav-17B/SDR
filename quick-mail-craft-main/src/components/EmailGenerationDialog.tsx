
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import EmailGenerationForm from './EmailGenerationForm';

interface EmailGenerationParams {
  tone: string;
  type: string;
  painPoints: string;
  additionalRequirements: string;
}

interface EmailGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: EmailGenerationParams) => void;
  isGenerating: boolean;
}

const EmailGenerationDialog = ({ isOpen, onClose, onGenerate, isGenerating }: EmailGenerationDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 border-2 border-gray-900 rounded-xl">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 bg-gray-900 text-white ">
          <DialogTitle className="text-xl font-semibold text-white">
            Email Generation Settings
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="p-6 bg-white rounded-b-xl">
          <EmailGenerationForm 
            onGenerate={onGenerate}
            isGenerating={isGenerating}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailGenerationDialog;
