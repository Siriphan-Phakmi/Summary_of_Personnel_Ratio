'use client';

import { useCallback } from 'react';
import { WardForm } from '@/app/features/ward-form/types/ward';
import { WardFieldLabels, FieldCategories } from '../wardFieldLabels';

// ✅ **Hospital Field Validation** - Based on BB's Categories
// Simple validation function for single field on blur
export const validateFieldSimple = (name: string, value: string | number): string | null => {
  // 📝 Text fields (Comment + Recorder fields)
  const textFields = ['recorderFirstName', 'recorderLastName', 'rejectionReason', 'comment'];
  
  if (textFields.includes(name)) {
    // Required recorder fields
    if (['recorderFirstName', 'recorderLastName'].includes(name)) {
      if (!value || String(value).trim() === '') {
        return 'กรุณาใส่ข้อมูล';
      }
    }
    return null; // Text fields pass validation
  }
  
  // 🔢 Numeric fields validation
  const numericValue = Number(value);
  if (isNaN(numericValue) || numericValue < 0) {
    return 'ต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0';
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

    // 1. ✅ Validate required recorder fields
    const requiredFields: (keyof WardForm)[] = ['recorderFirstName', 'recorderLastName'];
    requiredFields.forEach(field => {
      const value = formData[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        newErrors[field] = 'กรุณากรอกข้อมูล';
      }
    });

    // 2. ✅ Create consolidated numeric fields list from all categories
    const getAllNumericFields = (): (keyof WardForm)[] => {
      const fields: (keyof WardForm)[] = [];
      
      // Patient Census
      fields.push(...FieldCategories.PATIENT_CENSUS.fields);
      
      // Personnel/Positions
      fields.push(...FieldCategories.PERSONNEL.fields);
      
      // Patient Flow/Movement
      fields.push(...FieldCategories.PATIENT_FLOW.fields);
      
      // Bed/Room Status
      fields.push(...FieldCategories.BED_STATUS.fields);
      
      // Planning (numeric part only - plannedDischarge)
      fields.push('plannedDischarge');
      
      return fields;
    };

    // 3. ✅ Validate all numeric fields by category
    const numericFields = getAllNumericFields();
    
    numericFields.forEach(field => {
      const key = field as keyof WardForm;
      const value = formData[key];

      if (value !== undefined && value !== null && value !== '') {
        const numericValue = Number(value);
        if (isNaN(numericValue) || numericValue < 0) {
           newErrors[key] = 'ค่าต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0';
        }
        if (numericValue === 0) {
           // Use display label for zero value warnings
           const displayLabel = WardFieldLabels[key] || String(key);
           fieldsWithZero.push(displayLabel);
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