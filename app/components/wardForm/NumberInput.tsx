'use client';

import React, { forwardRef } from 'react';
import Input from '@/app/components/ui/Input';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ 
    label, 
    value, 
    onChange, 
    error, 
    disabled = false, 
    placeholder = '0', 
    min = 0, 
    max,
    ...props 
  }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      if (newValue === '') {
        onChange(0);
        return;
      }
      
      // Only allow numbers
      if (!/^\d*$/.test(newValue)) {
        return;
      }
      
      const numValue = parseInt(newValue, 10);
      
      // Check min/max constraints
      if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
        return;
      }
      
      onChange(numValue);
    };
    
    return (
      <Input
        ref={ref}
        type="text"
        label={label}
        value={value.toString()}
        onChange={handleChange}
        error={error}
        disabled={disabled}
        placeholder={placeholder}
        className={`text-center py-2 ${disabled ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
        min={min}
        max={max}
        inputMode="numeric"
        pattern="\d*"
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';

export default NumberInput; 