import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Loader2, Calendar, Clock, Users, ArrowRight, Sparkles, Mail, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface MailCompositionList {
  list_id: string;
  list_name: string;
  description?: string;
  created_date: string;
  created_time: string;
  last_updated: string;
  mail_type?: string;
  subject?: string;
  body?: string;
  recipients_count?: number;
  status?: 'draft' | 'completed' | 'sent';
}

interface MailCompositionListSelectorProps {
  onListSelect: (list: MailCompositionList) => void | Promise<void>;
  onDeleteList?: (listId: string) => void;
}

const MailCompositionListSelector = ({ onListSelect, onDeleteList }: MailCompositionListSelectorProps) => {
  const [compositionLists, setCompositionLists] = useState<MailCompositionList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<{id: string, name: string} | null>(null);

  const handleDeleteClick = (listId: string, listName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    setListToDelete({id: listId, name: listName});
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    
    try {
      if (onDeleteList) {
        await onDeleteList(listToDelete.id);
      }
      // Refresh the lists immediately after successful deletion
      await fetchCompositionLists();
      setDeleteConfirmOpen(false);
      setListToDelete(null);
    } catch (error) {
      console.error('Error deleting list:', error);
      // Keep dialog open on error
    }
  };

  useEffect(() => {
    fetchCompositionLists();
  }, []);

const fetchCompositionLists = async () => {
  try {
    setIsLoadingLists(true);
    console.log('📧 Fetching mail composition lists from API...');
    
    const sessionId = getSessionId();
    if (!sessionId) {
      console.log('No session ID found for mail composition lists');
      return;
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/mail-sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'X-Session-ID': sessionId
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('Not authenticated for mail composition lists');
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📧 Mail composition lists fetched successfully:', data);
    
    // Fix: Check for mail_lists instead of mail_sessions
    if (data.success && data.mail_lists) {
      // Map the data
      const mappedLists = data.mail_lists.map((session: any) => ({
        ...session,
        list_id: session.list_id,
        list_name: session.list_name
      }));
      setCompositionLists(mappedLists);
      console.log(`✅ Loaded ${mappedLists.length} mail composition lists from API`);
    } else {
      console.log('No mail composition lists returned from API');
      setCompositionLists([]);
    }
  } catch (error) {
    console.error('Error fetching mail composition lists:', error);
    toast.error('Failed to load mail composition lists');
  } finally {
    setIsLoadingLists(false);
  }
};

  const handleCreateNewList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }
    
    setIsCreatingList(true);
    
    try {
      console.log('➕ Creating new mail composition list...');
      
      // Get session ID from utils
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mail-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          list_name: newListName.trim(),
          description: newListDescription.trim() || null,
          mail_type: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.session) {
        // Refresh the lists
        await fetchCompositionLists();
        
        setNewListName('');
        setNewListDescription('');
        setIsCreateDialogOpen(false);
        
        toast.success(`Created new list: ${data.session.list_name}`);
        
        // Automatically select the new list
        const mappedList = {
          ...data.session,
          list_id: data.session.list_id,
          list_name: data.session.list_name
        };
        onListSelect(mappedList);
      } else {
        throw new Error('Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error(`Failed to create list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingList(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Mail className="w-3 h-3" />;
      case 'completed':
        return <Sparkles className="w-3 h-3" />;
      case 'draft':
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const filteredLists = compositionLists.filter(list =>
    list.list_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.mail_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white rounded-lg">
              <FileText className="h-6 w-6 text-gray-900" />
            </div>
            <h1 className="text-3xl font-bold">Mail Composition Lists</h1>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl">
            Organize your email campaigns with dedicated lists. Create, edit, and manage 
            multiple email compositions with AI assistance.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search composition lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New List
            </Button>
          </div>
        </div>

        {/* Lists Grid */}
        {isLoadingLists ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Loading your mail composition lists...</p>
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No lists found' : 'No mail composition lists yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first mail composition list to get started with AI-powered email creation'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First List
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list) => (
              <Card
                key={list.list_id}
                className="group cursor-pointer border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                onClick={() => onListSelect(list)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-full flex items-center justify-center transition-colors duration-300">
                        <FileText className="w-5 h-5 text-gray-600 group-hover:text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 line-clamp-1">
                          {list.list_name}
                        </h3>
                        {list.status && (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(list.status)}`}>
                            {getStatusIcon(list.status)}
                            {list.status}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteClick(list.list_id, list.list_name, e)}
                        className="p-1.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                        title="Delete list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                    </div>
                  </div>

                  {list.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {list.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{list.created_date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{list.created_time}</span>
                      </div>
                    </div>

                    {list.recipients_count !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        <span>{list.recipients_count} recipients</span>
                      </div>
                    )}

                    {list.subject && (
                      <div className="text-xs text-gray-400 truncate">
                        <span className="font-medium">Subject:</span> {list.subject}
                      </div>
                    )}

                    {list.mail_type && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                          {list.mail_type.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create New List Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Create New Mail Composition List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                List Name *
              </Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Cold Outreach Q1 2024, Product Launch Campaign"
                className="w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isCreatingList) {
                    handleCreateNewList();
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Description (Optional)
              </Label>
              <Textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Describe the purpose and target audience of this composition list"
                className="w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewListName('');
                  setNewListDescription('');
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewList}
                disabled={isCreatingList || !newListName.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isCreatingList ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create List
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete the list <strong>"{listToDelete?.name}"</strong>? 
              This will permanently remove all email templates from this list and cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteList}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MailCompositionListSelector;