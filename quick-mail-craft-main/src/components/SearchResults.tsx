
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, ChevronDown, ChevronUp, MoreVertical, Plus, List, Check, Users, CheckSquare } from 'lucide-react';
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

interface SearchResultsProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  getLeadDisplayName: (lead: Lead) => string;
  getLeadDisplayEmail: (lead: Lead) => string;
  getLeadCurrentPosition: (lead: Lead) => string;
  getLeadCurrentCompany: (lead: Lead) => string;
  getLeadPhoto: (lead: Lead) => string | undefined;
  searchParams?: any;
  onProspectsListUpdate?: () => void;
}

const SearchResults = ({ leads, onLeadClick, getLeadDisplayName, getLeadDisplayEmail, getLeadCurrentPosition, getLeadCurrentCompany, getLeadPhoto, searchParams, onProspectsListUpdate }: SearchResultsProps) => {
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [prospectsLists, setProspectsLists] = useState<ProspectsListItem[]>([]);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [selectedLeadForList, setSelectedLeadForList] = useState<Lead | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [isBulkListDialogOpen, setIsBulkListDialogOpen] = useState(false);
  const [bulkNewListName, setBulkNewListName] = useState('');
  const [bulkNewListDescription, setBulkNewListDescription] = useState('');

  useEffect(() => {
    fetchProspectsLists();
  }, []);

  const fetchProspectsLists = async () => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/prospects-lists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.prospects_lists) {
          setProspectsLists(data.prospects_lists);
        }
      }
    } catch (error) {
      console.error('Error fetching prospects lists:', error);
    }
  };

  const handleAddToList = async (listId: string, lead: Lead) => {
    console.log('\n➕ FRONTEND API CALL: ADD_TO_PROSPECTS_LIST');
    setIsAddingToList(true);
    
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/prospects-lists/${listId}/add-prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          prospects: [lead]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const listName = prospectsLists.find(list => list.list_id === listId)?.list_name || 'list';
          toast.success(`Added ${getLeadDisplayName(lead)} to ${listName}`);
          fetchProspectsLists(); // Refresh lists
          onProspectsListUpdate?.(); // Notify parent to refresh prospects list tab
        } else {
          toast.error(data.message || 'Failed to add to list');
        }
      } else {
        throw new Error('Failed to add to list');
      }
    } catch (error) {
      console.error('Error adding to list:', error);
      toast.error('Failed to add prospect to list');
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleCreateNewList = async (lead: Lead) => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    console.log('\n➕ FRONTEND API CALL: CREATE_PROSPECTS_LIST_WITH_LEAD');
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
          setNewListName('');
          setNewListDescription('');
          setIsNewListDialogOpen(false);
          setSelectedLeadForList(null);
          fetchProspectsLists(); // Refresh lists
          onProspectsListUpdate?.(); // Notify parent to refresh prospects list tab
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

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((_, index) => index)));
    }
  };

  const handleLeadSelect = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const handleBulkAddToList = async (listId: string) => {
    const selectedLeadsArray = Array.from(selectedLeads).map(index => leads[index]);
    
    console.log('\n➕ FRONTEND API CALL: BULK_ADD_TO_PROSPECTS_LIST');
    setIsAddingToList(true);
    
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/prospects-lists/${listId}/add-prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          prospects: selectedLeadsArray
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const listName = prospectsLists.find(list => list.list_id === listId)?.list_name || 'list';
          toast.success(`Added ${selectedLeadsArray.length} prospects to ${listName}`);
          setSelectedLeads(new Set()); // Clear selection
          fetchProspectsLists(); // Refresh lists
          onProspectsListUpdate?.(); // Notify parent to refresh prospects list tab
        } else {
          toast.error(data.message || 'Failed to add to list');
        }
      } else {
        throw new Error('Failed to add to list');
      }
    } catch (error) {
      console.error('Error bulk adding to list:', error);
      toast.error('Failed to add prospects to list');
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleBulkCreateNewList = async () => {
    if (!bulkNewListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    const selectedLeadsArray = Array.from(selectedLeads).map(index => leads[index]);

    console.log('\n➕ FRONTEND API CALL: BULK_CREATE_PROSPECTS_LIST');
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
          list_name: bulkNewListName.trim(),
          description: bulkNewListDescription.trim(),
          prospects: selectedLeadsArray
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Created list "${bulkNewListName}" with ${selectedLeadsArray.length} prospects`);
          setBulkNewListName('');
          setBulkNewListDescription('');
          setIsBulkListDialogOpen(false);
          setSelectedLeads(new Set()); // Clear selection
          fetchProspectsLists(); // Refresh lists
          onProspectsListUpdate?.(); // Notify parent to refresh prospects list tab
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

  if (leads.length === 0) {
    return null;
  }

  const formatParamValue = (value: any) => {
    if (Array.isArray(value) && value.length > 0) {
      return value.join(', ');
    }
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return null;
  };

  const getParamDisplayName = (key: string) => {
    const displayNames: Record<string, string> = {
      job_titles: 'Job Titles',
      company_names: 'Company Names',
      company_domains: 'Company Domains',
      departments: 'Departments',
      company_size: 'Company Size',
      company_revenue: 'Company Revenue',
      company_industry: 'Company Industry',
      company_sub_industry: 'Company Sub Industry',
      seniority: 'Seniority',
      technologies: 'Technologies',
      location_preference: 'Location Preference',
      countries: 'Countries',
      states: 'States',
      cities: 'Cities'
    };
    return displayNames[key] || key;
  };

  return (
    <Card className="border-gray-200 shadow-xl rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl font-bold text-white flex items-center">
            Search Results ({leads.length} leads found)
          </CardTitle>
          {searchParams && (
            <Collapsible open={isParamsOpen} onOpenChange={setIsParamsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-100 border-2 border-gray-200 text-gray-800 hover:bg-gray-200 hover:border-gray-300 hover:text-gray-900 rounded-lg font-medium transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-center">
                    See Search Params Used
                    {isParamsOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={selectedLeads.size === leads.length && leads.length > 0}
              onCheckedChange={handleSelectAll}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-gray-900"
            />
            <span className="text-sm font-medium">
              {selectedLeads.size === 0 ? 'Select All' : `${selectedLeads.size} selected`}
            </span>
          </div>
          
          {selectedLeads.size > 0 && (
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white text-gray-900 border-white hover:bg-gray-100"
                    disabled={isAddingToList}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add to List
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setIsBulkListDialogOpen(true)}
                    className="flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New List
                  </DropdownMenuItem>
                  {prospectsLists.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {prospectsLists.map((list) => (
                        <DropdownMenuItem
                          key={list.list_id}
                          onClick={() => handleBulkAddToList(list.list_id)}
                          disabled={isAddingToList}
                          className="flex items-center"
                        >
                          <List className="w-4 h-4 mr-2" />
                          Add to {list.list_name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLeads(new Set())}
                className="bg-transparent text-white border-white hover:bg-white/20"
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>
        {searchParams && (
          <Collapsible open={isParamsOpen} onOpenChange={setIsParamsOpen}>
            <CollapsibleContent className="mt-4">
              <div className="bg-gray-800/90 backdrop-blur-sm p-4 rounded-lg border border-gray-600">
                <h4 className="font-semibold text-sm mb-3 text-gray-100 flex items-center">
                  Search Parameters Used:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(searchParams).map(([key, value]) => {
                    const formattedValue = formatParamValue(value);
                    if (!formattedValue) return null;
                    
                    return (
                      <div key={key} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          {getParamDisplayName(key)}
                        </div>
                        <div className="text-sm text-gray-900 break-words font-medium">
                          {formattedValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {leads.map((lead, index) => (
            <div
              key={index}
              onClick={() => onLeadClick(lead)}
              className="group p-5 border border-gray-100 rounded-xl hover:bg-gradient-to-r hover:from-gray-900 hover:to-gray-800 hover:text-white cursor-pointer transition-all duration-300 hover:shadow-xl bg-white hover:border-gray-700 hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Checkbox
                    checked={selectedLeads.has(index)}
                    onCheckedChange={() => handleLeadSelect(index)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-3 opacity-60 group-hover:opacity-100 transition-opacity data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 group-hover:border-gray-400 group-hover:shadow-sm data-[state=checked]:opacity-100"
                  />
                </div>
                <div className="flex-shrink-0">
                  {getLeadPhoto(lead) ? (
                    <img 
                      src={getLeadPhoto(lead)} 
                      alt={getLeadDisplayName(lead)}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 group-hover:border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 group-hover:bg-white/20 rounded-full flex items-center justify-center shadow-sm border-2 border-gray-200 group-hover:border-white transition-all duration-300">
                      <User className="w-7 h-7 text-gray-500 group-hover:text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-white truncate text-lg">{getLeadDisplayName(lead)}</h3>
                      <p className="text-sm text-gray-600 group-hover:text-gray-200 truncate font-medium">{getLeadCurrentPosition(lead)}</p>
                      <p className="text-sm text-gray-500 group-hover:text-gray-300 truncate">{getLeadCurrentCompany(lead)}</p>
                      <div className="flex items-center space-x-1 mt-2">
                        <Mail className="w-3 h-3 text-gray-400 group-hover:text-gray-300" />
                        <span className="text-xs text-gray-500 group-hover:text-gray-300 truncate">{getLeadDisplayEmail(lead)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30 border border-white/20"
                          >
                            <MoreVertical className="w-4 h-4 text-white" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {prospectsLists.length > 0 && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeadForList(lead);
                                  setIsNewListDialogOpen(true);
                                }}
                                className="flex items-center"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New List
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {prospectsLists.map((list) => (
                                <DropdownMenuItem
                                  key={list.list_id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToList(list.list_id, lead);
                                  }}
                                  disabled={isAddingToList}
                                  className="flex items-center"
                                >
                                  <List className="w-4 h-4 mr-2" />
                                  Add to {list.list_name}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                          {prospectsLists.length === 0 && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLeadForList(lead);
                                setIsNewListDialogOpen(true);
                              }}
                              className="flex items-center"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create First List
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300">
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white rotate-[-90deg]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Dialog for creating new list */}
      <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New Prospects List
              {selectedLeadForList && (
                <div className="text-sm font-normal text-gray-600 mt-1">
                  Adding: {getLeadDisplayName(selectedLeadForList)}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                List Name *
              </label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Description (Optional)
              </label>
              <Textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Describe this prospects list"
                className="w-full"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewListDialogOpen(false);
                  setSelectedLeadForList(null);
                  setNewListName('');
                  setNewListDescription('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedLeadForList && handleCreateNewList(selectedLeadForList)}
                disabled={isCreatingList || !newListName.trim() || !selectedLeadForList}
              >
                {isCreatingList ? 'Creating...' : 'Create List'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Create List Dialog */}
      <Dialog open={isBulkListDialogOpen} onOpenChange={setIsBulkListDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Create New Prospects List
              <div className="text-sm font-normal text-gray-600 mt-1">
                Adding {selectedLeads.size} selected prospects
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                List Name *
              </label>
              <Input
                value={bulkNewListName}
                onChange={(e) => setBulkNewListName(e.target.value)}
                placeholder="e.g., Selected Prospects from Search"
                className="w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                value={bulkNewListDescription}
                onChange={(e) => setBulkNewListDescription(e.target.value)}
                placeholder="Describe this prospects list"
                className="w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkListDialogOpen(false);
                  setBulkNewListName('');
                  setBulkNewListDescription('');
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkCreateNewList}
                disabled={isCreatingList || !bulkNewListName.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isCreatingList ? 'Creating...' : `Create List with ${selectedLeads.size} Prospects`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SearchResults;
