
import React, { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SearchFormWithIcons from './SearchFormWithIcons';
import SearchResults from './SearchResults';
import SearchHistory from './SearchHistory';
import ProspectsList from './ProspectsList';
import LeadDetailsDialog from '@/components/LeadDetailsDialog';
import NewListDialog from '@/components/NewListDialog';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';
import { Search, List } from 'lucide-react';

// Mapping constants
const COMPANY_SIZE_MAPPING: Record<string, any> = {
  "1-10": { gte: 1, lte: 10 },
  "11-50": { gte: 11, lte: 50 },
  "51-200": { gte: 51, lte: 200 },
  "201-500": { gte: 201, lte: 500 },
  "501-1000": { gte: 501, lte: 1000 },
  "1001-5000": { gte: 1001, lte: 5000 },
  "5001-10000": { gte: 5001, lte: 10000 },
  "10000+": { gte: 10000 }
};

const COMPANY_REVENUE_MAPPING: Record<string, any> = {
  "0-1M": { gte: 0, lte: 1_000_000 },
  "1-10M": { gte: 1_000_000, lte: 10_000_000 },
  "10-50M": { gte: 10_000_000, lte: 50_000_000 },
  "50-100M": { gte: 50_000_000, lte: 100_000_000 },
  "100-500M": { gte: 100_000_000, lte: 500_000_000 },
  "500M-1B": { gte: 500_000_000, lte: 1_000_000_000 },
  "1B+": { gte: 1_000_000_000 }
};

interface Lead {
  [key: string]: any;
  email_list?: string[];
}

interface FormData {
  [key: string]: string | string[];
  jobTitles: string;
  companyNames: string;
  companyDomains: string;
  departments: string;
  companySize: string[];
  companyRevenue: string[];
  companyIndustry: string[];
  companySubIndustry: string[];
  seniority: string[];
  technologies: string;
  locationPreference: string;
  countries: string[];
  states: string[];
  cities: string[];
}

const FindLeadsContent = () => {
  const [formData, setFormData] = useState<FormData>({
    jobTitles: '',
    companyNames: '',
    companyDomains: '',
    departments: '',
    companySize: [],
    companyRevenue: [],
    companyIndustry: [],
    companySubIndustry: [],
    seniority: [],
    technologies: '',
    locationPreference: '',
    countries: [],
    states: [],
    cities: []
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [lastSearchParams, setLastSearchParams] = useState<any>(null);
  const [prospectsListKey, setProspectsListKey] = useState<number>(0);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = useState(false);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Clear dependent fields when country or state changes
      if (field === 'countries') {
        return {
          ...newData,
          states: [],
          cities: []
        };
      }
      if (field === 'states') {
        return {
          ...newData,
          cities: []
        };
      }

      return newData;
    });
  };

  const handleRemoveFilter = (field: string, value?: string) => {
    setFormData(prev => {
      if (value && Array.isArray(prev[field])) {
        // Remove specific value from array
        const currentArray = prev[field] as string[];
        return {
          ...prev,
          [field]: currentArray.filter(item => item !== value)
        };
      } else {
        // Clear entire field
        return {
          ...prev,
          [field]: Array.isArray(prev[field]) ? [] : ""
        };
      }
    });
  };

  const validateForm = () => {
    const filledFields = Object.values(formData).filter(value => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return typeof value === 'string' && value.trim() !== '';
    }).length;
    return filledFields >= 2;
  };

  const getFilledFieldsCount = () => {
    return Object.values(formData).filter(value => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return typeof value === 'string' && value.trim() !== '';
    }).length;
  };

  const convertToArrayIfNeeded = (value: string) => {
    return value.trim() ? value.split(',').map(item => item.trim()).filter(item => item) : [];
  };

  const handleSearchLeads = async () => {
    if (!validateForm()) {
      toast.error('Minimum 2 fields required', {
        description: `Please fill at least 2 fields to search for leads. Currently filled: ${getFilledFieldsCount()}`
      });
      return;
    }

    setIsSearching(true);
    const searchingToastId = toast.loading('Searching for leads...', {
      description: 'This may take a few moments'
    });

    try {
      // Get session ID from utils instead of using the prop
      const currentSessionId = getSessionId();
      
      const requestBody = {
        job_titles: convertToArrayIfNeeded(formData.jobTitles),
        company_names: convertToArrayIfNeeded(formData.companyNames),
        company_domains: convertToArrayIfNeeded(formData.companyDomains),
        departments: convertToArrayIfNeeded(formData.departments),
        company_size: formData.companySize.length > 0 ? formData.companySize : [],
        company_revenue: formData.companyRevenue.length > 0 ? formData.companyRevenue : [],
        company_industry: formData.companyIndustry.length > 0 ? formData.companyIndustry : [],
        company_sub_industry: formData.companySubIndustry.length > 0 ? formData.companySubIndustry : [],
        seniority: formData.seniority.length > 0 ? formData.seniority : [],
        technologies: convertToArrayIfNeeded(formData.technologies),
        location_preference: formData.locationPreference.trim(),
        countries: formData.countries.length > 0 ? formData.countries : [],
        states: formData.states.length > 0 ? formData.states : [],
        cities: formData.cities.length > 0 ? formData.cities : []
      };

      console.log('Lead search request body:', requestBody);
      setLastSearchParams(requestBody);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/fetch_leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-Session-ID': currentSessionId || ''
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Leads search response:', data);
      
      if (data.leads && Array.isArray(data.leads)) {
        setLeads(data.leads);
        toast.dismiss(searchingToastId);
        toast.success(`Found ${data.leads.length} lead(s)`, {
          description: 'Click on any lead to view details'
        });
      } else {
        setLeads([]);
        toast.dismiss(searchingToastId);
        toast.info('No leads found for the given criteria');
      }
    } catch (error) {
      console.error('Error searching leads:', error);
      toast.dismiss(searchingToastId);
      toast.error('Failed to search leads', {
        description: 'Please check your connection and try again'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };

  const handleSelectEmails = (emails: string[]) => {
    setSelectedEmails(emails);
    localStorage.setItem('selectedEmails', JSON.stringify(emails));
  };

  const refreshProspectsList = () => {
    setProspectsListKey(prev => prev + 1);
  };

  const handleOpenNewListDialog = () => {
    setIsNewListDialogOpen(true);
  };

  const handleNewListSuccess = () => {
    refreshProspectsList();
  };

  const handleLoadSearch = (searchParams: any, results: Lead[]) => {
    console.log('\n📥 FRONTEND: HANDLING LOAD SEARCH');
    console.log('📝 Received search params:', searchParams);
    console.log('📋 Received results count:', results?.length || 0);
    
    try {
      // Validate input parameters
      if (!searchParams || typeof searchParams !== 'object') {
        console.error('❌ Error: Invalid search params received');
        toast.error('Invalid search parameters');
        return;
      }

      // Ensure results is an array
      const safeResults: Lead[] = Array.isArray(results) ? results : [];
      console.log('📊 Using safe results array with', safeResults.length, 'items');

      // Convert search params back to form data format
      const convertedFormData: FormData = {
        jobTitles: Array.isArray(searchParams.job_titles) ? searchParams.job_titles.join(', ') : '',
        companyNames: Array.isArray(searchParams.company_names) ? searchParams.company_names.join(', ') : '',
        companyDomains: Array.isArray(searchParams.company_domains) ? searchParams.company_domains.join(', ') : '',
        departments: Array.isArray(searchParams.departments) ? searchParams.departments.join(', ') : '',
        companySize: Array.isArray(searchParams.company_size) ? searchParams.company_size : [],
        companyRevenue: Array.isArray(searchParams.company_revenue) ? searchParams.company_revenue : [],
        companyIndustry: Array.isArray(searchParams.company_industry) ? searchParams.company_industry : [],
        companySubIndustry: Array.isArray(searchParams.company_sub_industry) ? searchParams.company_sub_industry : [],
        seniority: Array.isArray(searchParams.seniority) ? searchParams.seniority : [],
        technologies: Array.isArray(searchParams.technologies) ? searchParams.technologies.join(', ') : '',
        locationPreference: searchParams.location_preference || '',
        countries: Array.isArray(searchParams.countries) ? searchParams.countries : [],
        states: Array.isArray(searchParams.states) ? searchParams.states : [],
        cities: Array.isArray(searchParams.cities) ? searchParams.cities : []
      };

      console.log('🔄 Converted form data:', {
        jobTitles: convertedFormData.jobTitles,
        companyNames: convertedFormData.companyNames,
        companySize: convertedFormData.companySize,
        seniority: convertedFormData.seniority,
        countries: convertedFormData.countries,
        // ... other non-empty fields
      });

      // Update form data and results
      console.log('📝 Updating form data state...');
      setFormData(convertedFormData);
      
      console.log('📋 Updating leads state...');
      setLeads(safeResults);
      
      console.log('📊 Updating search params state...');
      setLastSearchParams(searchParams);
      
      console.log('✅ Search history loaded successfully into form and results');
      
    } catch (error) {
      console.error('❌ Error in handleLoadSearch:', error);
      toast.error('Failed to load search data');
      
      // Reset to safe state
      setFormData({
        jobTitles: '',
        companyNames: '',
        companyDomains: '',
        departments: '',
        companySize: [],
        companyRevenue: [],
        companyIndustry: [],
        companySubIndustry: [],
        seniority: [],
        technologies: '',
        locationPreference: '',
        countries: [],
        states: [],
        cities: []
      });
      setLeads([]);
      setLastSearchParams(null);
    }
  };

  const getLeadDisplayName = (lead: Lead) => {
    return lead.personal_information?.full_name || 'Unknown Lead';
  };

  const getLeadDisplayEmail = (lead: Lead) => {
    return lead.personal_information?.primary_professional_email || lead.contact_information?.primary_email || 'No email available';
  };

  const getLeadCurrentPosition = (lead: Lead) => {
    return lead.current_position?.title || 'No position available';
  };

  const getLeadCurrentCompany = (lead: Lead) => {
    return lead.work_experience?.[0]?.company_name || 'No company available';
  };

  const getLeadPhoto = (lead: Lead) => {
    return lead.personal_information?.picture_url;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white rounded-lg">
              <svg className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">Prospect Discovery</h1>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl">
            Find and connect with qualified prospects using advanced search filters. 
            Build targeted lists for your outreach campaigns.
          </p>
        </div>
      </div>

     {/* Main Content */}
      <div className="bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="find-leads" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-200">
              
              <TabsTrigger 
                value="find-leads" 
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white font-semibold text-gray-600 hover:text-gray-900 transition-all duration-300 flex items-center gap-1 shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <Search className="w-5 h-5" />
                <span>Find Leads</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="prospects-lists" 
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white font-semibold text-gray-600 hover:text-gray-900 transition-all duration-300 flex items-center gap-1 shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <List className="w-5 h-5" />
                <span>My Prospects Lists</span>
              </TabsTrigger>
            </TabsList>
                  
            <TabsContent value="find-leads" className="space-y-6 mt-0">
              <SearchFormWithIcons
                formData={formData}
                onInputChange={handleInputChange}
                onSearch={handleSearchLeads}
                isSearching={isSearching}
                validateForm={validateForm}
                getFilledFieldsCount={getFilledFieldsCount}
                onRemoveFilter={handleRemoveFilter}
              />
              
              <SearchHistory onLoadSearch={handleLoadSearch} />

              <SearchResults
                leads={leads}
                onLeadClick={handleLeadClick}
                getLeadDisplayName={getLeadDisplayName}
                getLeadDisplayEmail={getLeadDisplayEmail}
                getLeadCurrentPosition={getLeadCurrentPosition}
                getLeadCurrentCompany={getLeadCurrentCompany}
                getLeadPhoto={getLeadPhoto}
                searchParams={lastSearchParams}
                onProspectsListUpdate={refreshProspectsList}
              />
            </TabsContent>

            <TabsContent value="prospects-lists" className="space-y-6 mt-0">
              <ProspectsList key={prospectsListKey} />
            </TabsContent>
          </Tabs>

          <LeadDetailsDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            lead={selectedLead}
            onSelectEmails={handleSelectEmails}
            onProspectsListUpdate={refreshProspectsList}
            onOpenNewListDialog={handleOpenNewListDialog}
          />

          {/* Separate New List Dialog */}
          {selectedLead && (
            <NewListDialog
              isOpen={isNewListDialogOpen}
              onClose={() => setIsNewListDialogOpen(false)}
              lead={selectedLead}
              onSuccess={handleNewListSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FindLeadsContent;
