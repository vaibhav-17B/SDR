import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface Lead {
  [key: string]: any;
  email_list?: string[];
}

interface NewListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSuccess?: () => void;
}

const NewListDialog = ({ isOpen, onClose, lead, onSuccess }: NewListDialogProps) => {
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  const getLeadDisplayName = (lead: Lead) => {
    return lead.personal_information?.full_name || 'Unknown Lead';
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    console.log('\n➕ FRONTEND API CALL: CREATE_PROSPECTS_LIST_FROM_DIALOG');
    setIsCreatingList(true);
    
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/prospects-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          list_name: newListName.trim(),
          description: newListDescription.trim(),
          prospects: [lead]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Created list "${newListName}" with ${getLeadDisplayName(lead)}`);
          handleClose();
          onSuccess?.();
        } else {
          toast.error(data.message || 'Failed to create list');
        }
      } else {
        throw new Error('Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create prospects list');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleClose = () => {
    setNewListName('');
    setNewListDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Create New Prospects List
            <div className="text-sm font-normal text-gray-600 mt-1">
              Adding: {getLeadDisplayName(lead)}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              List Name *
            </label>
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., High Priority Prospects"
              className="w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Description (Optional)
            </label>
            <Textarea
              value={newListDescription}
              onChange={(e) => setNewListDescription(e.target.value)}
              placeholder="Describe the purpose and target audience of this list"
              className="w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewList}
              disabled={isCreatingList || !newListName.trim()}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isCreatingList ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewListDialog;