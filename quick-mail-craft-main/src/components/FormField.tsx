
import React from 'react';
import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';

interface FormFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  helpText?: string;
}

const FormField = ({ label, placeholder, value, onChange, icon: Icon, helpText }: FormFieldProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center space-x-2">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;
