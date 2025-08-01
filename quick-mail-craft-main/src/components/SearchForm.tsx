
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Briefcase, Building, Globe, Users, DollarSign, MapPin, Laptop } from 'lucide-react';
import FormField from './FormField';

interface FormData {
  jobTitles: string;
  companyNames: string;
  companyDomains: string;
  departments: string;
  companySize: string;
  companyRevenue: string;
  companyIndustry: string;
  companySubIndustry: string;
  seniority: string;
  technologies: string;
  locationPreference: string;
  countries: string;
  states: string;
  cities: string;
}

interface SearchFormProps {
  formData: FormData;
  onInputChange: (field: string, value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  validateForm: () => boolean;
  getFilledFieldsCount: () => number;
}

const SearchForm = ({ 
  formData, 
  onInputChange, 
  onSearch, 
  isSearching, 
  validateForm, 
  getFilledFieldsCount 
}: SearchFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5" />
          <span>Find Leads</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Please fill at least 2 fields to search for leads. Currently filled: {getFilledFieldsCount()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            label="Job Titles"
            placeholder="e.g., Software Engineer, Data Scientist"
            value={formData.jobTitles}
            onChange={(value) => onInputChange('jobTitles', value)}
            icon={Briefcase}
            helpText="Separate multiple titles with commas"
          />

          <FormField
            label="Departments"
            placeholder="e.g., Engineering, Marketing, Sales"
            value={formData.departments}
            onChange={(value) => onInputChange('departments', value)}
            helpText="Separate multiple departments with commas"
          />

          <FormField
            label="Seniority"
            placeholder="e.g., Senior, Manager, Director"
            value={formData.seniority}
            onChange={(value) => onInputChange('seniority', value)}
          />

          <FormField
            label="Company Names"
            placeholder="e.g., Google, Microsoft, Apple"
            value={formData.companyNames}
            onChange={(value) => onInputChange('companyNames', value)}
            icon={Building}
            helpText="Separate multiple companies with commas"
          />

          <FormField
            label="Company Domains"
            placeholder="e.g., google.com, microsoft.com"
            value={formData.companyDomains}
            onChange={(value) => onInputChange('companyDomains', value)}
            icon={Globe}
            helpText="Separate multiple domains with commas"
          />

          <FormField
            label="Company Size"
            placeholder="e.g., 1-10, 11-50, 51-200, 201-500, 500+"
            value={formData.companySize}
            onChange={(value) => onInputChange('companySize', value)}
            icon={Users}
          />

          <FormField
            label="Company Revenue"
            placeholder="e.g., $1M-$10M, $10M-$100M"
            value={formData.companyRevenue}
            onChange={(value) => onInputChange('companyRevenue', value)}
            icon={DollarSign}
          />

          <FormField
            label="Company Industry"
            placeholder="e.g., Technology, Healthcare, Finance"
            value={formData.companyIndustry}
            onChange={(value) => onInputChange('companyIndustry', value)}
          />

          <FormField
            label="Company Sub-Industry"
            placeholder="e.g., Software, Biotechnology, Investment Banking"
            value={formData.companySubIndustry}
            onChange={(value) => onInputChange('companySubIndustry', value)}
          />

          <FormField
            label="Technologies"
            placeholder="e.g., React, Python, AWS, Docker"
            value={formData.technologies}
            onChange={(value) => onInputChange('technologies', value)}
            icon={Laptop}
            helpText="Separate multiple technologies with commas"
          />

          <FormField
            label="Location Preference"
            placeholder="e.g., Remote, Hybrid, On-site"
            value={formData.locationPreference}
            onChange={(value) => onInputChange('locationPreference', value)}
            icon={MapPin}
          />

          <FormField
            label="Countries"
            placeholder="e.g., United States, Canada, United Kingdom"
            value={formData.countries}
            onChange={(value) => onInputChange('countries', value)}
            helpText="Separate multiple countries with commas"
          />

          <FormField
            label="States"
            placeholder="e.g., California, New York, Texas"
            value={formData.states}
            onChange={(value) => onInputChange('states', value)}
            helpText="Separate multiple states with commas"
          />

          <FormField
            label="Cities"
            placeholder="e.g., San Francisco, New York, London"
            value={formData.cities}
            onChange={(value) => onInputChange('cities', value)}
            helpText="Separate multiple cities with commas"
          />
        </div>
        
        <div className="mt-6">
          <Button 
            onClick={onSearch} 
            disabled={isSearching || !validateForm()}
            className="w-full md:w-auto"
          >
            <Search className="w-4 h-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search Leads'}
          </Button>
          {!validateForm() && (
            <p className="text-sm text-red-600 mt-2">
              Please fill at least 2 fields to enable search
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchForm;
