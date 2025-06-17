// Re-export helpers from modular files to maintain backward compatibility
// This file serves as an entry point for all form persistence helpers

// LocalStorage helpers
export {
  type LocalStorageFormData,
  createStorageKey,
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  hasDraftInLocalStorage,
  getAllDraftsFromLocalStorage,
  cleanupOldDrafts,
  isLocalStorageDataFresh,
  createBackup,
  getLocalStorageSize,
  isLocalStorageFull
} from './helpers/localStorageHelpers';

// Validation helpers (inline since they're shorter)
import { WardForm, ShiftType, Ward } from '../types/ward';
import { validateFormData } from '../services/wardFormHelpers';
import { FIELD_LABELS } from './formPersistenceTypes';
import React from 'react';

/**
 * เพิ่มข้อมูลพื้นฐานที่จำเป็นสำหรับการ validate
 */
export const addBasicInfoForValidation = (
  data: Partial<WardForm>, 
  selectedWard: string, 
  selectedDate: string, 
  selectedShift: ShiftType, 
  wards: Ward[]
): Partial<WardForm> => {
  const wardObject = wards.find(w => w.id === selectedWard);
  const wardId = wardObject?.id || '';
  
  return {
    ...data,
    wardId,
    shift: selectedShift,
    dateString: selectedDate,
    date: new Date(`${selectedDate}T00:00:00`),
  };
};

/**
 * เตรียมข้อมูลสำหรับการบันทึก
 */
export const prepareDataForSave = (
  currentFormData: Partial<WardForm>,
  selectedWard: string,
  selectedDate: string,
  selectedShift: ShiftType,
  wards: Ward[]
): Partial<WardForm> => {
  const wardObject = wards.find(w => w.id === selectedWard);
  const wardId = wardObject?.id || '';
  const wardName = wardObject?.name || '';
  
  const dataToSave: Partial<WardForm> = {
    ...currentFormData,
    wardId,
    wardName,
    shift: selectedShift,
    dateString: selectedDate,
    date: new Date(`${selectedDate}T00:00:00`),
  };
  
  return dataToSave;
};

/**
 * ตรวจสอบความถูกต้องของฟอร์มและแสดงแจ้งเตือน
 */
export const validateFormAndNotify = (
  dataToValidate: Partial<WardForm>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): boolean => {
  const validation = validateFormData(dataToValidate);
  
  if (!validation.isValid) {
    const displayErrors: Record<string, string> = {};
    
    if (validation.errors) {
      Object.entries(validation.errors).forEach(([field, message]) => {
        if (typeof message === 'string') {
          const fieldLabel = FIELD_LABELS[field as keyof typeof FIELD_LABELS] || field;
          displayErrors[field] = `${fieldLabel}: ${message}`;
        }
      });
    }
    
    setErrors(displayErrors);
    return false;
  }
  
  setErrors({});
  return true;
};

/**
 * ตรวจสอบว่าควรแสดงคำเตือนการเขียนทับหรือไม่
 */
export const shouldShowOverwriteWarning = (
  existingDraftData: WardForm | null,
  preparedData: Partial<WardForm>
): boolean => {
  if (!existingDraftData) return false;
  
  // Compare a few key fields to determine if there's a significant change
  const hasSignificantChanges = (
    existingDraftData.patientCensus !== preparedData.patientCensus ||
    existingDraftData.admitted !== preparedData.admitted ||
    existingDraftData.discharged !== preparedData.discharged ||
    existingDraftData.availableBeds !== preparedData.availableBeds
  );
  
  return hasSignificantChanges;
}; 