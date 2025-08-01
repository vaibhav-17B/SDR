import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DropdownCheckboxProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  fieldKey: string;
  disabled?: boolean;
  disabledMessage?: string;
}

const DropdownCheckbox = ({
  label,
  icon: IconComponent,
  options,
  selected,
  onChange,
  placeholder,
  fieldKey,
  disabled = false,
  disabledMessage = ''
}: DropdownCheckboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, option]);
    } else {
      onChange(selected.filter(item => item !== option));
    }
  };

  const displayValue = selected.length > 0 
    ? `${selected.length} selected`
    : '';

  const effectivePlaceholder = disabled && disabledMessage ? disabledMessage : placeholder;

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label htmlFor={fieldKey} className="flex items-center space-x-2">
        <IconComponent className={`w-4 h-4 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={disabled ? 'text-gray-400' : ''}>{label}</span>
      </Label>
      
      <div className="relative">
        <Input
          id={fieldKey}
          type="text"
          placeholder={effectivePlaceholder}
          value={displayValue}
          readOnly
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full pr-8 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        />
        <ChevronDown 
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-transform ${
            disabled ? 'text-gray-400' : 'text-gray-500'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
        
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg">
            <ScrollArea className="h-32 p-2">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${fieldKey}-${option}`}
                      checked={selected.includes(option)}
                      onCheckedChange={(checked) => handleOptionChange(option, !!checked)}
                    />
                    <Label
                      htmlFor={`${fieldKey}-${option}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropdownCheckbox;