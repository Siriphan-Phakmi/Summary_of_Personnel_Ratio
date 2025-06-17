'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { WardForm } from '@/app/features/ward-form/types/ward';
import { UseWardFormDataProps, UseWardFormDataReturn } from './wardFormTypes';
import { useFormDataLoader } from './helpers/useFormDataLoader';
import { useFormSaveManager } from './helpers/useFormSaveManager';
import { useFormValidation } from './helpers/useFormValidation';
import { showErrorToast } from '@/utils/toastUtils';
import { ShiftType } from '../types/ward';

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
    isFormReadOnly: isReadOnlyFromLoader,
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
  const [isFormReadOnly, setIsFormReadOnly] = useState(isReadOnlyFromLoader);
  const { validateForm, validateField } = useFormValidation();

  const onSaveSuccess = useCallback((isFinal: boolean) => {
    setIsFormDirty(false);
    if(isFinal) {
      setIsFormReadOnly(true);
    }
    // No need to call loadData() here as cache is now managed internally in services
    // or we can rely on reloadDataTrigger if needed.
  }, [setIsFormDirty, setIsFormReadOnly]);

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
    const error = validateField(name, value);
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
    validateForm: (finalSave?: boolean) => { 
        const {isValid, errors} = validateForm(formData, finalSave);
        setErrors(errors);
        return isValid;
    },
    handleSaveDraft,
    handleSaveFinal,
    setIsFormReadOnly,
    showConfirmZeroModal,
    setShowConfirmZeroModal,
    fieldsWithValueZero,
    proceedWithSaveAfterZeroConfirmation,
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft,
    setReloadDataTrigger: () => {
      loadData();
    }
  };
}; 