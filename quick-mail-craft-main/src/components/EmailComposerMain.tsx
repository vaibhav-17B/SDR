
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface EmailComposerMainProps {
  onCreateMail: () => void;
}

const EmailComposerMain = ({ onCreateMail }: EmailComposerMainProps) => {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <div className="text-center max-w-3xl w-full">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-gray-900 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Email Composer</h1>
          <p className="text-gray-600 text-lg leading-relaxed">Generate and send professional emails with AI assistance</p>
        </div>
        
        <div className="mb-6">
          <Button
            onClick={onCreateMail}
            className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-10 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Mail className="w-5 h-5 mr-2" />
            Create AI Email
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposerMain;
