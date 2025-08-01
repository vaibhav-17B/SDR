
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface EmailComposerMainProps {
  onCreateMail: () => void;
}

const EmailComposerMain = ({ onCreateMail }: EmailComposerMainProps) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center max-w-3xl w-full">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Email Composer</h1>
          <p className="text-gray-600 text-lg">Generate and send professional emails with AI assistance</p>
        </div>
        
        <div className="mb-6">
          <Button
            onClick={onCreateMail}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
