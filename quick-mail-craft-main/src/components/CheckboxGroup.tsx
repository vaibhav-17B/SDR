import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CheckboxGroupProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxHeight?: string;
}

const CheckboxGroup = ({
  label,
  icon: IconComponent,
  options,
  selected,
  onChange,
  maxHeight = "h-32"
}: CheckboxGroupProps) => {
  const handleOptionChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, option]);
    } else {
      onChange(selected.filter(item => item !== option));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center space-x-2">
        <IconComponent className="w-4 h-4 text-gray-500" />
        <span>{label}</span>
      </Label>
      <ScrollArea className={`${maxHeight} border rounded-md p-2`}>
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${label}-${option}`}
                checked={selected.includes(option)}
                onCheckedChange={(checked) => handleOptionChange(option, !!checked)}
              />
              <Label
                htmlFor={`${label}-${option}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CheckboxGroup;