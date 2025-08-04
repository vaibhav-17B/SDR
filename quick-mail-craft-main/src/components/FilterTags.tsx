import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FormData {
  [key: string]: string | string[];
}

interface FilterTagsProps {
  filters: FormData;
  onRemoveFilter: (field: string, value?: string) => void;
  fieldLabels: { [key: string]: string };
}

const FilterTags = ({ filters, onRemoveFilter, fieldLabels }: FilterTagsProps) => {
  const renderTags = () => {
    const tags: JSX.Element[] = [];

    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // For array values (checkboxes), show each selected item as a tag
        value.forEach((item) => {
          tags.push(
            <Badge key={`${field}-${item}`} variant="secondary" className="flex items-center gap-1">
              <span className="text-xs">{fieldLabels[field]}: {item}</span>
              <X 
                className="w-3 h-3 cursor-pointer text-gray-500 hover:text-red-600"
                onClick={() => onRemoveFilter(field, item)}
              />
            </Badge>
          );
        });
      } else if (typeof value === 'string' && value.trim()) {
        // For string values, show as single tag
        tags.push(
          <Badge key={field} variant="secondary" className="flex items-center gap-1">
            <span className="text-xs">{fieldLabels[field]}: {value}</span>
            <X 
              className="w-3 h-3 cursor-pointer text-gray-500 hover:text-red-600"
              onClick={() => onRemoveFilter(field)}
            />
          </Badge>
        );
      }
    });

    return tags;
  };

  const tags = renderTags();

  if (tags.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Active Filters:</p>
      <div className="flex flex-wrap gap-2">
        {tags}
      </div>
    </div>
  );
};

export default FilterTags;