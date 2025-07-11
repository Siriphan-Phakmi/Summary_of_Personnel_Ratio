'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { UseWardFormDataProps, UseWardFormDataReturn } from './wardFormTypes';
import { useFormDataLoader } from './helpers/useFormDataLoader';
import { useFormSaveManager } from './helpers/useFormSaveManager';
import { useFormValidation } from './helpers/useFormValidation';
import { showErrorToast } from '@/app/lib/utils/toastUtils';

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
    loadData(); // Reload data to get the latest state including isFormReadOnly
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
    setFormData((prev: Partial<WardForm>) => ({ ...prev, [name]: value }));
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