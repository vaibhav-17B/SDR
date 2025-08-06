import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, History, Search, Calendar, Users, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

interface Lead {
  [key: string]: any;
  email_list?: string[];
}

interface SearchHistoryItem {
  search_id: string;
  search_date: string;
  search_time: string;
  total_results: number;
  search_params: Record<string, any>;
  results: Lead[];
  result_json_path?: string;
}

interface SearchHistoryProps {
  onLoadSearch?: (searchParams: Record<string, any>, results: Lead[]) => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ onLoadSearch }) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    console.log('\n🔍 FRONTEND API CALL: GET_SEARCH_HISTORY');
    
    try {
      setIsLoading(true);
      const sessionId = getSessionId();
      
      console.log('📝 API Parameters:', {
        endpoint: 'GET /api/search-history',
        limit: 2,
        sessionId: sessionId ? `${sessionId.substring(0, 10)}...` : 'null'
      });
      
      if (!sessionId) {
        console.log('❌ API ERROR: No session ID found');
        return;
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/search-history?limit=5`;
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
          console.log('❌ API ERROR: Not authenticated for search history');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API SUCCESS: GET_SEARCH_HISTORY');
      console.log('📤 Response data:', {
        success: data.success,
        user_email: data.user_email,
        total_searches: data.total_searches,
        search_history_count: data.search_history?.length || 0
      });
      
      if (data.search_history && data.search_history.length > 0) {
        console.log('📊 Search history details:');
        data.search_history.forEach((search, index) => {
          console.log(`   ${index + 1}. ID: ${search.search_id}`);
          console.log(`      Date: ${search.search_date} ${search.search_time}`);
          console.log(`      Results: ${search.total_results}`);
          console.log(`      Params: [${Object.keys(search.search_params || {}).join(', ')}]`);
        });
      }
      
      if (data.success && data.search_history) {
        setSearchHistory(data.search_history);
      }
    } catch (error) {
      console.error('❌ API ERROR: fetchSearchHistory failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (searchId: string) => {
    setSearchToDelete(searchId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!searchToDelete) return;
    await deleteSearch(searchToDelete);
    setDeleteConfirmOpen(false);
    setSearchToDelete(null);
  };

  const deleteSearch = async (searchId: string) => {
    console.log('\n🗑️ FRONTEND API CALL: DELETE_SEARCH_HISTORY');
    console.log('📝 API Parameters:', {
      endpoint: 'DELETE /api/search-history/{search_id}',
      searchId: searchId
    });
    
    try {
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.log('❌ API ERROR: No session ID found');
        toast.error('Authentication required');
        return;
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/search-history/${searchId}`;
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
      console.log('✅ API SUCCESS: DELETE_SEARCH_HISTORY');
      console.log('📤 Delete response data:', {
        success: data.success,
        message: data.message
      });
      
      if (data.success) {
        setSearchHistory(prev => prev.filter(item => item.search_id !== searchId));
        console.log('🔄 Updated search history state - removed:', searchId);
        toast.success('Search deleted successfully');
      }
    } catch (error) {
      console.error('❌ API ERROR: deleteSearch failed:', error);
      toast.error('Failed to delete search');
    }
  };

  const loadSearch = (historyItem: SearchHistoryItem) => {
    console.log('\n🔄 FRONTEND ACTION: LOAD_SEARCH_HISTORY');
    console.log('📝 Loading search:', {
      searchId: historyItem.search_id,
      searchDate: historyItem.search_date,
      resultsCount: historyItem.results?.length || 0,
      searchParams: Object.keys(historyItem.search_params || {})
    });
    
    if (onLoadSearch) {
      console.log('🔧 Calling onLoadSearch with params and results');
      console.log('📊 Search params being loaded:', historyItem.search_params);
      console.log('📋 Results being loaded:', `${historyItem.results?.length || 0} leads`);
      
      onLoadSearch(historyItem.search_params, historyItem.results);
      
      console.log('✅ Search loaded successfully');
      toast.success(`Loaded search from ${historyItem.search_date}`);
    } else {
      console.log('⚠️ onLoadSearch callback not provided');
    }
  };

  const formatSearchParams = (params: Record<string, any>) => {
    const formatted: string[] = [];
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        const displayName = getParamDisplayName(key);
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        if (displayValue) {
          formatted.push(`${displayName}: ${displayValue}`);
        }
      }
    });
    
    return formatted;
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

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2 text-gray-600" />
                Search History ({searchHistory.length})
              </CardTitle>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            <CardContent className="pt-0 space-y-4">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading search history...</p>
                </div>
              ) : (
                searchHistory.map((historyItem) => (
                  <div key={historyItem.search_id} className="border border-gray-200 rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{historyItem.search_date} at {historyItem.search_time}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{historyItem.total_results} results</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadSearch(historyItem)}
                            className="text-xs"
                          >
                            <Search className="w-3 h-3 mr-1" />
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(historyItem.search_id)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <Collapsible 
                        open={expandedSearch === historyItem.search_id} 
                        onOpenChange={(open) => setExpandedSearch(open ? historyItem.search_id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-gray-600 hover:text-gray-900 p-0 h-auto"
                          >
                            {expandedSearch === historyItem.search_id ? 'Hide' : 'Show'} Search Parameters
                            {expandedSearch === historyItem.search_id ? 
                              <ChevronUp className="w-3 h-3 ml-1" /> : 
                              <ChevronDown className="w-3 h-3 ml-1" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-3">
                          <div className="bg-gray-50 p-3 rounded border">
                            <h5 className="text-xs font-medium text-gray-700 mb-2">Search Parameters:</h5>
                            <div className="grid grid-cols-1 gap-1">
                              {formatSearchParams(historyItem.search_params).map((param, index) => (
                                <div key={index} className="text-xs text-gray-600">
                                  • {param}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

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
              Are you sure you want to delete this search history? This action cannot be undone.
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
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SearchHistory;