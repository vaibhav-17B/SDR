import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, List, Users, Trash2, Edit2, Plus, Calendar, AlertTriangle, User, Mail, MoreVertical, Search, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface Lead {
  [key: string]: any;
  email_list?: string[];
}

interface ProspectsListItem {
  list_id: string;
  list_name: string;
  description: string;
  created_date: string;
  created_time: string;
  total_prospects: number;
  prospects: Lead[];
  last_updated: string;
  tags: string[];
}

interface ProspectsListProps {
  onSelectProspectsForNewList?: (prospects: Lead[]) => void;
}

const ProspectsList: React.FC<ProspectsListProps> = ({ onSelectProspectsForNewList }) => {
  const [prospectsLists, setProspectsLists] = useState<ProspectsListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<{id: string, name: string} | null>(null);
  const [prospectDeleteConfirmOpen, setProspectDeleteConfirmOpen] = useState(false);
  const [prospectToDelete, setProspectToDelete] = useState<{listId: string, prospectIndex: number, prospectName: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProspectsLists();
  }, []);

  const fetchProspectsLists = async () => {
    console.log('\n📋 FRONTEND API CALL: GET_PROSPECTS_LISTS');
    
    try {
      setIsLoading(true);
      const sessionId = getSessionId();
      
      console.log('📝 API Parameters:', {
        endpoint: 'GET /api/prospects-lists',
        sessionId: sessionId ? `${sessionId.substring(0, 10)}...` : 'null'
      });
      
      if (!sessionId) {
        console.log('❌ API ERROR: No session ID found');
        return;
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/prospects-lists`;
      console.log('🌐 Making request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('❌ API ERROR: Not authenticated for prospects lists');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API SUCCESS: GET_PROSPECTS_LISTS');
      console.log('📤 Response data:', {
        success: data.success,
        user_email: data.user_email,
        total_lists: data.total_lists,
        prospects_lists_count: data.prospects_lists?.length || 0
      });
      
      if (data.success && data.prospects_lists) {
        setProspectsLists(data.prospects_lists);
      }
    } catch (error) {
      console.error('❌ API ERROR: fetchProspectsLists failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    console.log('\n➕ FRONTEND API CALL: CREATE_PROSPECTS_LIST');
    console.log('📝 API Parameters:', {
      endpoint: 'POST /api/prospects-lists',
      listName: newListName,
      description: newListDescription
    });
    
    try {
      setIsCreatingList(true);
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.log('❌ API ERROR: No session ID found');
        toast.error('Authentication required');
        return;
      }

      const requestBody = {
        list_name: newListName.trim(),
        description: newListDescription.trim(),
        prospects: [] // Empty list initially
      };

      const apiUrl = `${API_CONFIG.BASE_URL}/api/prospects-lists`;
      console.log('🌐 Making create request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Create response status:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ API ERROR: Create request failed with status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API SUCCESS: CREATE_PROSPECTS_LIST');
      console.log('📤 Create response data:', {
        success: data.success,
        list_id: data.list_id,
        message: data.message
      });
      
      if (data.success) {
        toast.success('Prospects list created successfully');
        setNewListName('');
        setNewListDescription('');
        setIsNewListDialogOpen(false);
        await fetchProspectsLists(); // Refresh the lists immediately
      }
    } catch (error) {
      console.error('❌ API ERROR: createNewList failed:', error);
      toast.error('Failed to create prospects list');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleDeleteClick = (listId: string, listName: string) => {
    setListToDelete({id: listId, name: listName});
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    await deleteList(listToDelete.id);
    setDeleteConfirmOpen(false);
    setListToDelete(null);
  };

  const handleDeleteProspect = (listId: string, prospectIndex: number, prospectName: string) => {
    setProspectToDelete({listId, prospectIndex, prospectName});
    setProspectDeleteConfirmOpen(true);
  };

  const confirmDeleteProspect = async () => {
    if (!prospectToDelete) return;
    await deleteProspectFromList(prospectToDelete.listId, prospectToDelete.prospectIndex);
    setProspectDeleteConfirmOpen(false);
    setProspectToDelete(null);
  };

  const deleteProspectFromList = async (listId: string, prospectIndex: number) => {
    console.log('\n🗑️ FRONTEND API CALL: DELETE_PROSPECT_FROM_LIST');
    
    try {
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.log('❌ API ERROR: No session ID found');
        toast.error('Authentication required');
        return;
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/prospects-lists/${listId}/prospects/${prospectIndex}`;
      console.log('🌐 Making delete request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      console.log('📡 Delete response status:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ API ERROR: Delete request failed with status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API SUCCESS: DELETE_PROSPECT_FROM_LIST');
      console.log('📤 Delete response data:', {
        success: data.success,
        message: data.message
      });
      
      if (data.success) {
        toast.success('Prospect removed from list successfully');
        await fetchProspectsLists(); // Refresh to ensure consistency
      }
    } catch (error) {
      console.error('❌ API ERROR: deleteProspectFromList failed:', error);
      toast.error('Failed to remove prospect from list');
    }
  };

  const deleteList = async (listId: string) => {
    console.log('\n🗑️ FRONTEND API CALL: DELETE_PROSPECTS_LIST');
    console.log('📝 API Parameters:', {
      endpoint: 'DELETE /api/prospects-lists/{list_id}',
      listId: listId
    });
    
    try {
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.log('❌ API ERROR: No session ID found');
        toast.error('Authentication required');
        return;
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/prospects-lists/${listId}`;
      console.log('🌐 Making delete request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      console.log('📡 Delete response status:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ API ERROR: Delete request failed with status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API SUCCESS: DELETE_PROSPECTS_LIST');
      console.log('📤 Delete response data:', {
        success: data.success,
        message: data.message
      });
      
      if (data.success) {
        setProspectsLists(prev => prev.filter(item => item.list_id !== listId));
        console.log('🔄 Updated prospects lists state - removed:', listId);
        toast.success('Prospects list deleted successfully');
        await fetchProspectsLists(); // Refresh to ensure consistency
      }
    } catch (error) {
      console.error('❌ API ERROR: deleteList failed:', error);
      toast.error('Failed to delete prospects list');
    }
  };

  const getProspectDisplayName = (prospect: Lead) => {
    return prospect.personal_information?.full_name || 'Unknown Name';
  };

  const getProspectDisplayEmail = (prospect: Lead) => {
    return prospect.personal_information?.primary_professional_email || 
           prospect.contact_information?.primary_email || 'No email available';
  };

  const getProspectCurrentPosition = (prospect: Lead) => {
    return prospect.current_position?.title || 'No position available';
  };

  const getProspectCurrentCompany = (prospect: Lead) => {
    return prospect.work_experience?.[0]?.company_name || 'No company available';
  };

  const getProspectPhoto = (prospect: Lead) => {
    return prospect.personal_information?.picture_url;
  };

  // Filter prospects lists based on search query
  const filteredProspectsLists = prospectsLists.filter(list => 
    list.list_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (prospectsLists.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <List className="w-7 h-7 mr-3 text-gray-700" />
              My Prospects Lists
            </h2>
            <p className="text-gray-600 mt-1">Organize and manage your prospects efficiently</p>
          </div>
          <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                Create New List
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Create New Prospects List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    List Name *
                  </label>
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Tech Startup CEOs, Marketing Directors"
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
                    onClick={() => setIsNewListDialogOpen(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createNewList}
                    disabled={isCreatingList || !newListName.trim()}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {isCreatingList ? 'Creating...' : 'Create List'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty State */}
        <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-100 p-6 mb-6">
              <List className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No prospects lists yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-6">
              Create your first prospects list to organize leads by criteria, campaign, or industry. 
              You can add prospects from search results with a single click.
            </p>
            <Button
              onClick={() => setIsNewListDialogOpen(true)}
              className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <List className="w-7 h-7 mr-3 text-gray-700" />
            My Prospects Lists ({searchQuery ? filteredProspectsLists.length : prospectsLists.length}{searchQuery ? ` of ${prospectsLists.length}` : ''})
          </h2>
          <p className="text-gray-600 mt-1">Organize and manage your prospects efficiently</p>
        </div>
        <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
              <Plus className="w-4 h-4 mr-2" />
              Create New List
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Create New Prospects List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  List Name *
                </label>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Tech Startup CEOs, Marketing Directors"
                  className={`w-full border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 shadow-md hover:shadow-lg focus:shadow-lg transition-all duration-300 ${
                    newListName.trim() ? 'bg-[#E8F0FE] border-blue-300' : ''
                  }`}
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
                  className={`w-full border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 shadow-md hover:shadow-lg focus:shadow-lg transition-all duration-300 ${
                    newListDescription.trim() ? 'bg-[#E8F0FE] border-blue-300' : ''
                  }`}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsNewListDialogOpen(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createNewList}
                  disabled={isCreatingList || !newListName.trim()}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {isCreatingList ? 'Creating...' : 'Create List'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search lists by name, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-3 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
        />
        {searchQuery && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Lists Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Loading prospects lists...</p>
          </div>
        ) : filteredProspectsLists.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No lists found</h3>
            <p className="text-gray-600">No prospects lists match your search criteria.</p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProspectsLists.map((listItem) => (
              <Card 
                key={listItem.list_id} 
                className="border border-gray-200 hover:border-gray-900 hover:bg-slate-100 transition-all duration-300 shadow-lg hover:shadow-xl bg-white cursor-pointer transform hover:scale-[1.01]"
                onClick={() => setExpandedList(expandedList === listItem.list_id ? null : listItem.list_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{listItem.list_name}</h3>
                      {listItem.description && (
                        <p className="text-gray-600 text-sm">{listItem.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(listItem.list_id, listItem.list_name);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {listItem.created_date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span className="font-medium text-gray-900">{listItem.total_prospects} prospects</span>
                      </div>
                    </div>
                  </div>

                  <Collapsible 
                    open={expandedList === listItem.list_id} 
                    onOpenChange={(open) => setExpandedList(open ? listItem.list_id : null)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">
                        Click anywhere to {expandedList === listItem.list_id ? 'hide' : 'view'} prospects
                      </span>
                      <div className="flex items-center text-gray-600">
                        {expandedList === listItem.list_id ? 
                          <ChevronUp className="w-5 h-5" /> : 
                          <ChevronDown className="w-5 h-5" />
                        }
                      </div>
                    </div>
                    
                    <CollapsibleContent className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                        <h5 className="text-sm font-medium text-gray-700 mb-4">Prospects in this list:</h5>
                        {listItem.prospects.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No prospects in this list yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {listItem.prospects.map((prospect, index) => (
                              <div
                                key={index}
                                className="group bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-900 hover:bg-slate-100 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    {getProspectPhoto(prospect) ? (
                                      <img 
                                        src={getProspectPhoto(prospect)} 
                                        alt={getProspectDisplayName(prospect)}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-sm border-2 border-gray-200">
                                        <User className="w-6 h-6 text-gray-500" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-grow min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">{getProspectDisplayName(prospect)}</h4>
                                        <p className="text-sm text-gray-600 truncate">{getProspectCurrentPosition(prospect)}</p>
                                        <p className="text-sm text-gray-500 truncate">{getProspectCurrentCompany(prospect)}</p>
                                        <div className="flex items-center space-x-1 mt-1">
                                          <Mail className="w-3 h-3 text-gray-400" />
                                          <span className="text-xs text-gray-500 truncate">{getProspectDisplayEmail(prospect)}</span>
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 ml-4">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <MoreVertical className="w-4 h-4 text-gray-500" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => handleDeleteProspect(listItem.list_id, index, getProspectDisplayName(prospect))}
                                              className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Remove from List
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
              This will permanently remove all prospects from this list and cannot be undone.
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

      {/* Prospect Delete Confirmation Dialog */}
      <Dialog open={prospectDeleteConfirmOpen} onOpenChange={setProspectDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Remove Prospect
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to remove <strong>"{prospectToDelete?.prospectName}"</strong> from this list? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setProspectDeleteConfirmOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteProspect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove Prospect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectsList;