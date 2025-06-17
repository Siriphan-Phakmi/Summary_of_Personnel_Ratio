'use client';

import { useCallback } from 'react';
import { WardForm } from '@/app/features/ward-form/types/ward';
import { WardFieldLabels } from '../wardFieldLabels';

// Simple validation function for single field on blur
export const validateFieldSimple = (name: string, value: string | number): string | null => {
  if (['recorderFirstName', 'recorderLastName'].includes(name)) {
    if (!value || String(value).trim() === '') {
      return 'กรุณาใส่ข้อมูล';
    }
  }
  
  const numericValue = Number(value);
  if (isNaN(numericValue) || numericValue < 0) {
      if (name !== 'recorderFirstName' && name !== 'recorderLastName' && name !== 'rejectionReason') {
          return 'ต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0';
      }
  }

  return null;
};


export interface UseFormValidationReturn {
  validateField: (name: string, value: string | number) => string | null;
  validateForm: (formData: Partial<WardForm>, finalSave?: boolean) => {
    isValid: boolean,
    errors: Record<string, string>,
    fieldsWithZero: string[],
  };
}

export const useFormValidation = (): UseFormValidationReturn => {
  
  const validateForm = useCallback((formData: Partial<WardForm>, finalSave: boolean = false): {
    isValid: boolean,
    errors: Record<string, string>,
    fieldsWithZero: string[],
  } => {
    const newErrors: Record<string, string> = {};
    const fieldsWithZero: string[] = [];

    // 1. Validate required fields
    const requiredFields: (keyof WardForm)[] = ['recorderFirstName', 'recorderLastName'];
    requiredFields.forEach(field => {
      const value = formData[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        newErrors[field] = 'กรุณากรอกข้อมูล';
      }
    });

    // 2. Validate all numeric fields
    const numericFields = Object.keys(WardFieldLabels) as (keyof WardForm)[];
    
    numericFields.forEach(field => {
      // Skip validation for non-numeric fields that are in WardFieldLabels
      if (['recorderFirstName', 'recorderLastName', 'rejectionReason'].includes(field as string)) {
        return;
      }
        
      const key = field as keyof WardForm;
      const value = formData[key];

      if (value !== undefined && value !== null && value !== '') {
        const numericValue = Number(value);
        if (isNaN(numericValue) || numericValue < 0) {
           newErrors[key] = 'ค่าต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0';
        }
        if (numericValue === 0) {
           fieldsWithZero.push(WardFieldLabels[key] || key);
        }
      } else if (finalSave) {
        // For final save, treat empty numeric fields as errors
        newErrors[key] = 'กรุณากรอกข้อมูล';
      }
    });

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
      fieldsWithZero: fieldsWithZero,
    };
  }, []);

  return {
    validateField: validateFieldSimple,
    validateForm,
  };
}; 