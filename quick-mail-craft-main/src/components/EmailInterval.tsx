
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock } from 'lucide-react';

interface EmailIntervalProps {
  intervalType: 'daily' | 'specific' | 'exclude-weekends';
  selectedDays: string[];
  onIntervalTypeChange: (type: 'daily' | 'specific' | 'exclude-weekends') => void;
  onDayToggle: (day: string) => void;
}

const EmailInterval = ({ 
  intervalType, 
  selectedDays, 
  onIntervalTypeChange, 
  onDayToggle 
}: EmailIntervalProps) => {
  const weekdays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4" />
        <Label className="text-sm font-medium">Email Sending Interval</Label>
      </div>
      
      <RadioGroup 
        value={intervalType} 
        onValueChange={(value) => onIntervalTypeChange(value as 'daily' | 'specific' | 'exclude-weekends')}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="daily" id="daily" />
          <Label htmlFor="daily">Daily</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="exclude-weekends" id="exclude-weekends" />
          <Label htmlFor="exclude-weekends">Exclude Weekends (Mon-Fri only)</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="specific" id="specific" />
          <Label htmlFor="specific">Specific Days</Label>
        </div>
      </RadioGroup>

      {intervalType === 'specific' && (
        <div className="ml-6 space-y-2">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4" />
            <Label className="text-sm">Select Days:</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {weekdays.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={day.value}
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={() => onDayToggle(day.value)}
                />
                <Label 
                  htmlFor={day.value} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
          {selectedDays.length === 0 && intervalType === 'specific' && (
            <p className="text-xs text-red-600 mt-1">
              Please select at least one day
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailInterval;
