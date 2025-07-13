'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { UseWardFormDataProps, UseWardFormDataReturn } from './wardFormTypes';
import { useFormDataLoader } from './helpers/useFormDataLoader';
import { useFormSaveManager } from './helpers/useFormSaveManager';
import { useFormValidation } from './helpers/useFormValidation';
import { showErrorToast } from '@/app/lib/utils/toastUtils';
import { 
  calculateUnavailableBeds, 
  calculateAvailableBeds, 
  calculatePlannedDischarge 
} from '../services/wardFormHelpers';

export const useWardFormData = ({
  selectedWard,
  selectedBusinessWardId,
  selectedDate,
  selectedShift,
  user,
  reloadDataTrigger,
}: UseWardFormDataProps): UseWardFormDataReturn => {
  
  const {
    formData,
    setFormData,
    isLoading,
    error,
    isFormReadOnly,
    isDraftLoaded,
    isFinalDataFound,
    isFormDirty,
    setIsFormDirty,
    loadData,
  } = useFormDataLoader({
    selectedBusinessWardId,
    selectedDate,
    selectedShift,
    user,
    reloadDataTrigger,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { validateForm, validateField } = useFormValidation();

  const onSaveSuccess = useCallback((isFinal: boolean) => {
    setIsFormDirty(false);
    loadData(true); // Force a refetch to get the latest data from the database
  }, [setIsFormDirty, loadData]);

  const {
    isSaving,
    handleSave,
    showConfirmZeroModal,
    setShowConfirmZeroModal,
    fieldsWithValueZero,
    proceedWithSaveAfterZeroConfirmation,
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft,
  } = useFormSaveManager({
    formData,
    selectedBusinessWardId,
    selectedDate,
    selectedShift,
    user,
    onSaveSuccess,
  });

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // อัพเดทข้อมูลหลัก
    setFormData((prev: Partial<WardForm>) => {
      const newFormData = { ...prev, [name]: value };
      
      // 🎯 Auto-calculation logic ตามคำขอของคุณบีบี
      
      // 1. Auto-fill Unavailable Beds เมื่อกรอก New Admit, Transfer In, Refer In
      if (['admitted', 'transferredIn', 'referIn'].includes(name)) {
        const autoUnavailable = calculateUnavailableBeds(newFormData);
        newFormData.unavailableBeds = autoUnavailable;
      }
      
      // 2. Auto-fill Available Beds และ Planned Discharge เมื่อกรอก Transfer Out, Refer Out, Discharge, Dead
      if (['transferredOut', 'referOut', 'discharged', 'deaths'].includes(name)) {
        const autoAvailable = calculateAvailableBeds(newFormData);
        const autoPlannedDischarge = calculatePlannedDischarge(newFormData);
        
        newFormData.availableBeds = autoAvailable;
        newFormData.plannedDischarge = autoPlannedDischarge;
      }
      
      return newFormData;
    });
    
    setIsFormDirty(true);
    
    if (errors[name]) {
      setErrors((prev: Record<string, string>) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors, setFormData, setIsFormDirty]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // ✅ BB's Smart Validation: Only validate format/type on blur, not required fields
    // Required fields will be validated only when user attempts to save
    const error = validateField(name, value, false); // isOnSave = false for blur validation
    
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    } else if (errors[name]) {
      setErrors((prev: Record<string, string>) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [validateField, errors]);

  const handleValidationAndSave = useCallback(async (saveType: 'draft' | 'final') => {
    const { isValid, errors: validationErrors } = validateForm(formData, saveType === 'final');
    setErrors(validationErrors);

    if (isValid) {
      await handleSave(saveType);
    } else {
      showErrorToast('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข');
    }
  }, [formData, validateForm, handleSave]);

  const handleSaveDraft = () => handleValidationAndSave('draft');
  const handleSaveFinal = () => handleValidationAndSave('final');

  const isCensusAutoCalculated = selectedShift === ShiftType.MORNING || selectedShift === ShiftType.NIGHT;
  
  return {
    formData,
    errors,
    isLoading,
    isSaving,
    isFormReadOnly,
    isCensusAutoCalculated,
    error,
    isDraftLoaded,
    isFinalDataFound,
    isFormDirty,
    handleChange,
    handleBlur,
    handleSaveDraft,
    handleSaveFinal,
    showConfirmZeroModal,
    setShowConfirmZeroModal,
    fieldsWithValueZero,
    proceedWithSaveAfterZeroConfirmation,
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft,
  };
}; 