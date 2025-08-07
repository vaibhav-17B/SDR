
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit3, X, Check } from 'lucide-react';

interface EmailSection {
  id: string;
  name: string;
  emailData: any;
}

interface SecondaryNavbarProps {
  emailSections: EmailSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  onAddSection: () => void;
  onUpdateSectionName: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  editingName: string | null;
  onEditName: (id: string | null) => void;
}

const SecondaryNavbar = ({
  emailSections,
  activeSection,
  onSectionChange,
  onAddSection,
  onUpdateSectionName,
  onDeleteSection,
  editingName,
  onEditName
}: SecondaryNavbarProps) => {
  const [editingValue, setEditingValue] = useState('');

  const handleEditStart = (section: EmailSection) => {
    setEditingValue(section.name);
    onEditName(section.id);
  };

  const handleEditSave = (id: string) => {
    if (editingValue.trim()) {
      onUpdateSectionName(id, editingValue.trim());
    }
    onEditName(null);
    setEditingValue('');
  };

  const handleEditCancel = () => {
    onEditName(null);
    setEditingValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleEditSave(id);
    }
    if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="py-6 px-4 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Campaign Templates</h3>
              <p className="text-sm text-gray-600 mt-1">Choose from predefined email templates or create custom sections</p>
            </div>
            <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-200">
              Currently editing: <span className="font-medium text-gray-900">
                {(emailSections.find(s => s.id === activeSection)?.name || 'initial_email').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {emailSections.map((section, index) => (
              <div 
                key={section.id}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white border-gray-800 shadow-lg hover:shadow-xl'
                    : 'bg-white text-gray-700 border-gray-100 shadow-md hover:shadow-lg hover:border-gray-200 transform hover:scale-105'
                }`}
              >
                {editingName === section.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="h-7 min-w-[120px] text-sm bg-white text-gray-900 border-gray-300"
                      onKeyDown={(e) => handleKeyDown(e, section.id)}
                      autoFocus
                      placeholder="Section name..."
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditSave(section.id)}
                      className="h-6 w-6 p-0 hover:bg-white/20 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditCancel}
                      className="h-6 w-6 p-0 hover:bg-white/20 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSectionChange(section.id)}
                        className="font-medium text-left"
                      >
                        {section.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                      {parseInt(section.id) <= 7 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Template
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {parseInt(section.id) > 7 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(section)}
                          className="h-6 w-6 p-0 hover:bg-white/20 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110"
                          title="Edit section name"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                      {emailSections.length > 1 && parseInt(section.id) > 7 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteSection(section.id)}
                          className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-500 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110"
                          title="Delete section"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            
            <Button
              onClick={onAddSection}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 px-4 py-2 border-dashed border-2 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:border-gray-400 hover:text-gray-800 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondaryNavbar;
