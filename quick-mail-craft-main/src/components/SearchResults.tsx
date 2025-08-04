
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface Lead {
  [key: string]: any;
  email_list?: string[];
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
}

const SearchResults = ({ leads, onLeadClick, getLeadDisplayName, getLeadDisplayEmail, getLeadCurrentPosition, getLeadCurrentCompany, getLeadPhoto, searchParams }: SearchResultsProps) => {
  const [isParamsOpen, setIsParamsOpen] = useState(false);

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
        <div className="flex items-center justify-between">
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
                    <div className="flex-shrink-0 ml-4">
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
    </Card>
  );
};

export default SearchResults;
