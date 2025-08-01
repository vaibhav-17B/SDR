
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Search Results ({leads.length} leads found)
        </CardTitle>
        {searchParams && (
          <Collapsible open={isParamsOpen} onOpenChange={setIsParamsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-fit">
                See Search Params Used
                {isParamsOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <h4 className="font-semibold text-sm mb-3 text-muted-foreground">Search Parameters Used:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(searchParams).map(([key, value]) => {
                    const formattedValue = formatParamValue(value);
                    if (!formattedValue) return null;
                    
                    return (
                      <div key={key} className="bg-background p-3 rounded border">
                        <div className="text-xs font-medium text-primary mb-1">
                          {getParamDisplayName(key)}
                        </div>
                        <div className="text-sm text-foreground break-words">
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
      <CardContent>
        <div className="space-y-3">
          {leads.map((lead, index) => (
            <div
              key={index}
              onClick={() => onLeadClick(lead)}
              className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getLeadPhoto(lead) ? (
                    <img 
                      src={getLeadPhoto(lead)} 
                      alt={getLeadDisplayName(lead)}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{getLeadDisplayName(lead)}</h3>
                      <p className="text-sm text-muted-foreground truncate">{getLeadCurrentPosition(lead)}</p>
                      <p className="text-sm text-muted-foreground truncate">{getLeadCurrentCompany(lead)}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">{getLeadDisplayEmail(lead)}</span>
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
