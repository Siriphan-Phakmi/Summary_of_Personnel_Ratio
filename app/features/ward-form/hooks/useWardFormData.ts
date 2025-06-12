'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef, Dispatch, SetStateAction } from 'react';
import { WardForm, ShiftType, FormStatus, Ward } from '@/app/core/types/ward';
import { User, UserRole } from '@/app/core/types/user';
import { 
  getWardForm, 
  saveDraftWardForm,
  finalizeMorningShiftForm,
  finalizeNightShiftForm
} from '../services/wardFormService';
import { showErrorToast, showSafeToast, dismissAllToasts } from '@/app/core/utils/toastUtils';
import { logUserActivity } from '@/app/core/utils/logUtils';
import { Timestamp } from 'firebase/firestore';
import {
  initialFormStructure,
  convertFormDataFromFirebase,
  getFieldsWithZeroValue
} from './useWardFormDataHelpers';

interface UseWardFormDataProps {
  selectedWard: string;
  selectedBusinessWardId: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  reloadDataTrigger: number;
}

interface UseWardFormDataReturn {
  formData: Partial<WardForm>;
  errors: Record<string, string>;
  isLoading: boolean;
  isSaving: boolean;
  isMorningCensusReadOnly: boolean;
  isFormReadOnly: boolean;
  isCensusAutoCalculated: boolean;
  error: string | null;
  isDraftLoaded: boolean;
  isFinalDataFound: boolean;
  isFormDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  validateForm: (finalSave?: boolean) => boolean;
  handleSaveDraft: () => Promise<void>;
  handleSaveFinal: () => Promise<void>;
  setIsFormReadOnly: Dispatch<SetStateAction<boolean>>;
  showConfirmZeroModal: boolean;
  setShowConfirmZeroModal: Dispatch<SetStateAction<boolean>>;
  fieldsWithValueZero: string[];
  proceedWithSaveAfterZeroConfirmation: () => Promise<void>;
  showConfirmOverwriteModal: boolean;
  setShowConfirmOverwriteModal: Dispatch<SetStateAction<boolean>>;
  proceedToSaveDraft: () => Promise<void>;
  setReloadDataTrigger: Dispatch<SetStateAction<number>>;
}

// Simple validation function
const validateFieldSimple = (name: string, value: string): string | null => {
  if (!value || value.trim() === '') {
    if (['recorderFirstName', 'recorderLastName'].includes(name)) {
      return 'กรุณาใส่ข้อมูล';
    }
  }
  return null;
};

export const useWardFormData = ({
  selectedWard,
  selectedBusinessWardId,
  selectedDate,
  selectedShift,
  user,
  reloadDataTrigger,
}: UseWardFormDataProps): UseWardFormDataReturn => {
  
  // States
  const [formData, setFormData] = useState<Partial<WardForm>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMorningCensusReadOnly, setIsMorningCensusReadOnly] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(false);
  const [isCensusAutoCalculated, setIsCensusAutoCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isFinalDataFound, setIsFinalDataFound] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showConfirmZeroModal, setShowConfirmZeroModal] = useState(false);
  const [fieldsWithValueZero, setFieldsWithValueZero] = useState<string[]>([]);
  const [saveActionType, setSaveActionType] = useState<'draft' | 'final' | null>(null);
  const [showConfirmOverwriteModal, setShowConfirmOverwriteModal] = useState(false);
  const [localReloadTrigger, setReloadDataTrigger] = useState<number>(0);

  const prevSelectionRef = useRef({ ward: selectedBusinessWardId, date: selectedDate });

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedBusinessWardId || !selectedDate || !user?.uid) {
      return; 
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dateTimestamp = Timestamp.fromDate(targetDate);
      
      const existingForm = await getWardForm(dateTimestamp, selectedShift, selectedBusinessWardId);
      
      if (existingForm) {
        const isFinal = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
        const loadedData = convertFormDataFromFirebase(existingForm, selectedDate);
        
        if (user && !isFinal) {
          loadedData.recorderFirstName = loadedData.recorderFirstName?.trim() || user.firstName || '';
          loadedData.recorderLastName = loadedData.recorderLastName?.trim() || user.lastName || '';
        }

        setFormData(loadedData);
        setIsFinalDataFound(isFinal);
        setIsDraftLoaded(existingForm.status === FormStatus.DRAFT);
        
        const isAdminOrDeveloper = user?.role === UserRole.ADMIN || 
                                   user?.role === UserRole.SUPER_ADMIN || 
                                   user?.role === UserRole.DEVELOPER;
        setIsFormReadOnly(isFinal && !isAdminOrDeveloper);
        
        if (selectedShift === ShiftType.NIGHT && loadedData.initialPatientCensus !== undefined) {
          setIsMorningCensusReadOnly(true);
        }
      } else {
        const newData = { ...initialFormStructure };
        
        if (user) {
          newData.recorderFirstName = user.firstName || '';
          newData.recorderLastName = user.lastName || '';
        }

        if (selectedShift === ShiftType.NIGHT) {
          try {
            const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, selectedBusinessWardId);
            if (morningForm?.patientCensus !== undefined) {
              newData.initialPatientCensus = morningForm.patientCensus;
              setIsMorningCensusReadOnly(true);
            }
          } catch (error) {
            console.log('Could not load morning form');
          }
        }
        
        setFormData(newData);
        setIsFinalDataFound(false);
        setIsDraftLoaded(false);
        setIsFormReadOnly(false);
      }
      
      setIsFormDirty(false);
      
    } catch (error) {
      console.error('Load error:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      showErrorToast('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusinessWardId, selectedDate, selectedShift, user]);

  // Load effect
  useEffect(() => {
    const currentSelection = { ward: selectedBusinessWardId, date: selectedDate };
    const needsReload = JSON.stringify(currentSelection) !== JSON.stringify(prevSelectionRef.current) ||
                       reloadDataTrigger !== localReloadTrigger;

    if (needsReload) {
      prevSelectionRef.current = currentSelection;
      setReloadDataTrigger(reloadDataTrigger);
      loadData();
    }
  }, [loadData, selectedBusinessWardId, selectedDate, reloadDataTrigger, localReloadTrigger]);

  // Handlers
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsFormDirty(true);
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateFieldSimple(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, []);

  const validateForm = useCallback((finalSave: boolean = false): boolean => {
    const newErrors: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateFieldSimple(key, value as string);
      if (error) {
        newErrors[key] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Save functions
  const performSaveDraft = useCallback(async () => {
    if (!user || !selectedBusinessWardId || !selectedDate || !validateForm()) {
      showErrorToast('ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง');
      return;
    }

    try {
      setIsSaving(true);
      const saveData = {
        ...formData,
        wardId: selectedBusinessWardId,
        date: selectedDate,
        shift: selectedShift,
        status: FormStatus.DRAFT,
        isDraft: true,
        createdBy: user.uid,
        updatedBy: user.uid
      };
      await saveDraftWardForm(saveData as WardForm, user);
      showSafeToast('บันทึกฉบับร่างเรียบร้อย', 'success');
      setIsFormDirty(false);
      logUserActivity(user.uid, user.username || user.displayName || '', 'SAVE_DRAFT', {
        formType: 'ward_form',
        wardId: selectedBusinessWardId,
        shift: selectedShift,
        date: selectedDate
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      showErrorToast('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedBusinessWardId, selectedDate, selectedShift, formData, validateForm]);

  const performSaveFinal = useCallback(async () => {
    if (!user || !selectedBusinessWardId || !selectedDate || !validateForm(true)) {
      showErrorToast('ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง');
      return;
    }

    try {
      setIsSaving(true);
      dismissAllToasts();
      showSafeToast('กำลังส่งข้อมูล...', 'info');
      
      const saveData = {
        ...formData,
        wardId: selectedBusinessWardId,
        date: selectedDate,
        shift: selectedShift,
        status: FormStatus.FINAL,
        isDraft: false,
        createdBy: user.uid,
        updatedBy: user.uid
      };

      if (selectedShift === ShiftType.MORNING) {
        await finalizeMorningShiftForm(saveData as WardForm, user);
      } else {
        await finalizeNightShiftForm(saveData as WardForm, user);
      }
      
      showSafeToast('ส่งข้อมูลเรียบร้อย', 'success');
      setIsFormDirty(false);
      logUserActivity(user.uid, user.username || user.displayName || '', 'SAVE_FINAL', {
        formType: 'ward_form',
        wardId: selectedBusinessWardId,
        shift: selectedShift,
        date: selectedDate
      });
    } catch (error) {
      console.error('Error saving final:', error);
      showErrorToast('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedBusinessWardId, selectedDate, selectedShift, formData, validateForm]);

  const proceedWithSaveAfterZeroConfirmation = useCallback(async () => {
    setShowConfirmZeroModal(false);
    if (saveActionType === 'draft') {
      await performSaveDraft();
    } else if (saveActionType === 'final') {
      await performSaveFinal();
    }
    setSaveActionType(null);
  }, [saveActionType, performSaveDraft, performSaveFinal]);

  const proceedToSaveDraft = useCallback(async () => {
    setShowConfirmOverwriteModal(false);
    await performSaveDraft();
  }, [performSaveDraft]);

  const handleSaveDraft = useCallback(async () => {
    const zeroFields = getFieldsWithZeroValue(formData);
    if (zeroFields.length > 0) {
      setFieldsWithValueZero(zeroFields);
      setShowConfirmZeroModal(true);
      setSaveActionType('draft');
      return;
    }
    await performSaveDraft();
  }, [formData, performSaveDraft]);

  const handleSaveFinal = useCallback(async () => {
    const zeroFields = getFieldsWithZeroValue(formData);
    if (zeroFields.length > 0) {
      setFieldsWithValueZero(zeroFields);
      setShowConfirmZeroModal(true);
      setSaveActionType('final');
      return;
    }
    await performSaveFinal();
  }, [formData, performSaveFinal]);

  return {
    formData,
    errors,
    isLoading,
    isSaving,
    isMorningCensusReadOnly,
    isFormReadOnly,
    isCensusAutoCalculated,
    error,
    isDraftLoaded,
    isFinalDataFound,
    isFormDirty,
    handleChange,
    handleBlur,
    validateForm,
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
    setReloadDataTrigger
  };
}; 