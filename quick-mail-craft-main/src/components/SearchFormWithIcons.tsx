
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Briefcase, Building, Globe, Users, DollarSign, Factory, Target, Cpu, MapPin, Flag, Map, Building2 } from 'lucide-react';
import DropdownCheckbox from './DropdownCheckbox';
import FilterTags from './FilterTags';
import { countries, statesByCountry, citiesByState, industries, subIndustries } from '@/data/locationData';

interface LeadFormData {
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
  // locationPreference: string;
  countries: string[];
  states: string[];
  cities: string[];
}

interface SearchFormProps {
  formData: LeadFormData;
  onInputChange: (field: string, value: string | string[]) => void;
  onSearch: () => void;
  isSearching: boolean;
  validateForm: () => boolean;
  getFilledFieldsCount: () => number;
  onRemoveFilter: (field: string, value?: string) => void;
}

const SearchFormWithIcons = ({
  formData,
  onInputChange,
  onSearch,
  isSearching,
  validateForm,
  getFilledFieldsCount,
  onRemoveFilter
}: SearchFormProps) => {
  // Predefined options for checkbox groups
  const companySizeOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"];
  const companyRevenueOptions = ["0-1M", "1-10M", "10-50M", "50-100M", "100-500M", "500M-1B", "1B+"];
  const seniorityOptions = ["Entry", "Junior", "Associate", "Mid", "Senior", "Lead", "Manager", "Director", "VP", "C-Level", "Executive", "Founder", "Owner", "Partner"];

  // Field labels for tags
  const fieldLabels = {
    jobTitles: 'Job Titles',
    companyNames: 'Company Names',
    companyDomains: 'Company Domains',
    departments: 'Departments',
    companySize: 'Company Size',
    companyRevenue: 'Company Revenue',
    companyIndustry: 'Company Industry',
    companySubIndustry: 'Company Sub-Industry',
    seniority: 'Seniority',
    technologies: 'Technologies',
    // locationPreference: 'Location Preference',
    countries: 'Countries',
    states: 'States',
    cities: 'Cities'
  };

  // Filter available states based on selected countries
  const availableStates = useMemo(() => {
    if (formData.countries.length === 0) return [];
    
    const allStates = formData.countries.flatMap(country => 
      statesByCountry[country] || []
    );
    return [...new Set(allStates)];
  }, [formData.countries]);

  // Filter available cities based on selected states
  const availableCities = useMemo(() => {
    if (formData.states.length === 0) return [];
    
    const allCities = formData.states.flatMap(state => 
      citiesByState[state] || []
    );
    return [...new Set(allCities)];
  }, [formData.states]);

  const textInputFields = [
    { key: 'jobTitles', label: 'Job Titles', placeholder: 'CEO, CTO, Manager', icon: Briefcase },
    { key: 'companyNames', label: 'Company Names', placeholder: 'Google, Microsoft, Apple', icon: Building },
    { key: 'companyDomains', label: 'Company Domains', placeholder: 'google.com, microsoft.com', icon: Globe },
    { key: 'departments', label: 'Departments', placeholder: 'Engineering, Sales, Marketing', icon: Users },
    { key: 'technologies', label: 'Technologies', placeholder: 'React, Python, AWS', icon: Cpu },
    // { key: 'locationPreference', label: 'Location Preference', placeholder: 'Remote, On-site, Hybrid', icon: MapPin }
  ];

  const dropdownCheckboxFields = [
    { key: 'companySize', label: 'Company Size', options: companySizeOptions, placeholder: 'Select company sizes', icon: Building2 },
    { key: 'companyRevenue', label: 'Company Revenue', options: companyRevenueOptions, placeholder: 'Select revenue ranges', icon: DollarSign },
    { key: 'seniority', label: 'Seniority', options: seniorityOptions, placeholder: 'Select seniority levels', icon: Target },
    { key: 'companyIndustry', label: 'Company Industry', options: industries, placeholder: 'Select industries', icon: Factory },
    { key: 'companySubIndustry', label: 'Company Sub-Industry', options: subIndustries, placeholder: 'Select sub-industries', icon: Factory },
    { 
      key: 'countries', 
      label: 'Countries', 
      options: countries, 
      placeholder: 'Select countries', 
      icon: Flag 
    },
    { 
      key: 'states', 
      label: 'States', 
      options: availableStates, 
      placeholder: 'Select states', 
      icon: Map,
      disabled: formData.countries.length === 0,
      disabledMessage: 'Select country first'
    },
    { 
      key: 'cities', 
      label: 'Cities', 
      options: availableCities, 
      placeholder: 'Select cities', 
      icon: Building2,
      disabled: formData.states.length === 0,
      disabledMessage: 'Select state first'
    }
  ];

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5" />
          <span>Find Leads</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Fill at least 2 fields to search for leads. Currently filled: {getFilledFieldsCount()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Tags */}
        <FilterTags 
          filters={formData}
          onRemoveFilter={onRemoveFilter}
          fieldLabels={fieldLabels}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Text Input Fields */}
          {textInputFields.map((field) => {
            const IconComponent = field.icon;
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="flex items-center space-x-2">
                  <IconComponent className="w-4 h-4 text-gray-500" />
                  <span>{field.label}</span>
                </Label>
                <Input
                  id={field.key}
                  type="text"
                  placeholder={field.placeholder}
                  value={formData[field.key as keyof LeadFormData] as string}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                  className={`w-full shadow-md hover:shadow-lg focus:shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ${
                    formData[field.key as keyof LeadFormData] && (formData[field.key as keyof LeadFormData] as string).trim()
                      ? 'bg-[#E8F0FE] border-blue-300' 
                      : ''
                  }`}
                />
              </div>
            );
          })}

          {/* Dropdown Checkbox Fields */}
          {dropdownCheckboxFields.map((field) => (
            <DropdownCheckbox
              key={field.key}
              label={field.label}
              icon={field.icon}
              options={field.options}
              selected={formData[field.key as keyof LeadFormData] as string[]}
              onChange={(selected) => onInputChange(field.key, selected)}
              placeholder={field.placeholder}
              fieldKey={field.key}
              disabled={field.disabled}
              disabledMessage={field.disabledMessage}
            />
          ))}
        </div>
        
        <div className="pt-4 border-t">
          <Button
            onClick={onSearch}
            disabled={!validateForm() || isSearching}
            className="w-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Leads
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchFormWithIcons;
