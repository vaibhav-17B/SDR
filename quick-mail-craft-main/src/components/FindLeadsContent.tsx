
import React, { useState } from 'react';
import { toast } from 'sonner';
import SearchFormWithIcons from './SearchFormWithIcons';
import SearchResults from './SearchResults';
import LeadDetailsDialog from '@/components/LeadDetailsDialog';
import { API_CONFIG } from '@/config/api';
import { getSessionId } from '@/utils/session';

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <SearchFormWithIcons
          formData={formData}
          onInputChange={handleInputChange}
          onSearch={handleSearchLeads}
          isSearching={isSearching}
          validateForm={validateForm}
          getFilledFieldsCount={getFilledFieldsCount}
          onRemoveFilter={handleRemoveFilter}
        />

        <SearchResults
          leads={leads}
          onLeadClick={handleLeadClick}
          getLeadDisplayName={getLeadDisplayName}
          getLeadDisplayEmail={getLeadDisplayEmail}
          getLeadCurrentPosition={getLeadCurrentPosition}
          getLeadCurrentCompany={getLeadCurrentCompany}
          getLeadPhoto={getLeadPhoto}
          searchParams={lastSearchParams}
        />

        <LeadDetailsDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          lead={selectedLead}
          onSelectEmails={handleSelectEmails}
        />
      </div>
    </div>
  );
};

export default FindLeadsContent;
