'use client';

import { useState, useCallback } from 'react';
import { WardForm, ShiftType, FormStatus, Ward } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { logUserActivity } from '@/app/core/utils/logUtils'; // Import logger
import {
  saveMorningShiftFormDraft,
  finalizeMorningShiftForm,
  saveNightShiftFormDraft,
  finalizeNightShiftForm,
  validateFormData,
  getWardForm, // Needed for finalization checks
  getPreviousNightShiftForm, // Needed for calculations
  checkMorningShiftFormStatus, // Needed for finalization checks
  calculateMorningCensus,
  calculateNightShiftCensus,
  getLatestDraftForm // Needed for draft confirmation logic
} from '../services/wardFormService';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import { createServerTimestamp } from '@/app/core/utils/timestampUtils';
import { logSystemError } from '@/app/core/utils/logUtils';
import { formatDateYMD } from '@/app/core/utils/dateUtils'; // Import formatDateYMD

interface UseFormPersistenceProps {
  formData: Partial<WardForm>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<WardForm>>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedWard: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  wards: Ward[]; // Pass wards list to find wardName
  existingDraftData: WardForm | null; // From useWardFormData
  setExistingDraftData: React.Dispatch<React.SetStateAction<WardForm | null>>; // To update after save
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  morningShiftStatus: FormStatus | null;
  setMorningShiftStatus: React.Dispatch<React.SetStateAction<FormStatus | null>>;
  nightShiftStatus: FormStatus | null;
  setNightShiftStatus: React.Dispatch<React.SetStateAction<FormStatus | null>>;
  setIsMorningShiftDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNightShiftDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  isMorningCensusReadOnly: boolean; // From useWardFormData
}

export const useFormPersistence = ({
  formData,
  setFormData,
  errors,
  setErrors,
  selectedWard,
  selectedDate,
  selectedShift,
  user,
  wards, 
  existingDraftData,
  setExistingDraftData,
  setIsSaving,
  morningShiftStatus,
  setMorningShiftStatus,
  nightShiftStatus,
  setNightShiftStatus,
  setIsMorningShiftDisabled,
  setIsNightShiftDisabled,
  isMorningCensusReadOnly
}: UseFormPersistenceProps) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // --- Validation --- 
  const validateForm = useCallback((): boolean => {
    const validationResult = validateFormData(formData);
    setErrors(validationResult.errors);
    
    if (!validationResult.isValid && validationResult.missingFields.length > 0) {
      const firstMissingField = validationResult.missingFields[0];
      showErrorToast(`กรุณากรอกข้อมูล "${firstMissingField}" ให้ครบถ้วน`);

      // Try to focus the first invalid field
      try {
        const fieldElement = document.querySelector(`[name="${firstMissingField}"]`) as HTMLElement;
        if (fieldElement) {
          fieldElement.focus();
        }
      } catch (e) {
        console.error("Error focusing on element:", e);
      }
    }
    
    return validationResult.isValid;
  }, [formData, setErrors]);

  // --- Save Draft --- 
  const handleSaveDraft = useCallback(async () => {
    if (!user) {
      showErrorToast('กรุณาเข้าสู่ระบบก่อนบันทึก');
      return;
    }
    if (!selectedWard || !selectedDate) {
       showErrorToast('กรุณาเลือกวอร์ดและวันที่');
       return;
    }

    // --- Find wardName FIRST ---
    const wardName = wards.find(w => w.id === selectedWard)?.wardName || 'Unknown'; // Find wardName before validation

    // Prepare data object for validation, including wardName
    const dataForValidation = {
      ...formData,
      wardId: selectedWard, // Ensure wardId is included
      date: formData.date || selectedDate, // Ensure date is included
      shift: selectedShift, // Ensure shift is included
      wardName: wardName, // Include the found wardName
    };

    console.log('[handleSaveDraft] Data for validation:', dataForValidation); // Log data being validated

    // --- Validate using the prepared data ---
    const validationResult = validateFormData(dataForValidation); // Validate the complete object
    console.log(`[handleSaveDraft] Validation - isValid: ${validationResult.isValid}`);
    console.log('[handleSaveDraft] Validation - missingFields:', JSON.stringify(validationResult.missingFields)); // Stringify to force display
    console.log('[handleSaveDraft] Validation - errors:', JSON.stringify(validationResult.errors)); // Stringify to force display

    setErrors(validationResult.errors); // Set the Record
    
    if (!validationResult.isValid) {
        console.warn(`Draft validation failed. Missing fields: ${JSON.stringify(validationResult.missingFields)}, Errors: ${JSON.stringify(validationResult.errors)}`); // Improved warning
        showErrorToast('ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบ');
        return; 
    }
    
    if (existingDraftData?.wardId === selectedWard && 
        existingDraftData?.dateString === formatDateYMD(new Date(selectedDate + 'T12:00:00')) && 
        existingDraftData?.shift === selectedShift) {
      setIsConfirmModalOpen(true); 
      return; 
    }

    await performSaveDraft();

  }, [formData, user, selectedWard, selectedDate, selectedShift, existingDraftData, setErrors]);

  const performSaveDraft = useCallback(async (isOverwrite: boolean = false) => {
     if (!user) return; 
     
     setIsSaving(true);
     setErrors({}); // Clear Record<string, string>
     
     try {
       const validationResult = validateFormData(formData);
       if (!validationResult.isValid) {
           setErrors(validationResult.errors); // Set Record<string, string>
           showErrorToast('เกิดข้อผิดพลาด: ข้อมูลไม่ถูกต้อง ไม่สามารถบันทึกร่างได้');
           setIsSaving(false);
           return;
       }

       let savedDocId: string | null = null;
       const wardName = wards.find(w => w.id === selectedWard)?.wardName || 'Unknown';
       const dataToSave = {
         ...formData,
         wardName: wardName,
         id: (isOverwrite && existingDraftData?.id) ? existingDraftData.id : undefined, 
       };
       
       if (selectedShift === ShiftType.MORNING) {
         savedDocId = await saveMorningShiftFormDraft(dataToSave, user);
         setMorningShiftStatus(FormStatus.DRAFT); 
       } else {
         savedDocId = await saveNightShiftFormDraft(dataToSave, user);
         setNightShiftStatus(FormStatus.DRAFT); 
       }
       
       if (savedDocId) {
           let dateValueForString: Date;
           // Ensure dateValueForString is Date before passing to formatDateYMD
           const dateFromForm = formData.date;
           if (dateFromForm instanceof Timestamp) {
               dateValueForString = dateFromForm.toDate();
           } else if (dateFromForm instanceof Date) {
               dateValueForString = dateFromForm;
           } else {
                // Handle case where date might be string or other format
                try {
                    dateValueForString = new Date(dateFromForm as string | number);
                    if (isNaN(dateValueForString.getTime())) { // Check if date is valid
                       throw new Error('Invalid date format');
                    }
                } catch (e) {
                     console.warn("Could not parse date, defaulting for dateString", e);
                     dateValueForString = new Date(); // Fallback
                }
           }
           const dateValue = formData.date instanceof Timestamp ? formData.date.toDate() : formData.date;
           const createdAtValue = formData.createdAt instanceof Timestamp ? formData.createdAt.toDate() : formData.createdAt;

           const newDraftData = { 
               ...dataToSave, 
               id: savedDocId, 
               status: FormStatus.DRAFT,
               isDraft: true,
               createdAt: createdAtValue || new Date(), 
               updatedAt: new Date(), 
               date: dateValue, 
               // Correctly pass the definite Date object to formatDateYMD
               dateString: formData.dateString || formatDateYMD(dateValueForString) 
           } as WardForm; 
           setExistingDraftData(newDraftData);
       }

       showSuccessToast('บันทึกข้อมูลร่างสำเร็จ');
       setIsConfirmModalOpen(false); 
       
     } catch (error) {
       console.error('Error saving draft:', error);
       const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกร่าง';
       if (errorMessage.startsWith('Validation failed:')) {
           showErrorToast(`บันทึกร่างไม่สำเร็จ: ${errorMessage.replace('Validation failed: ', '')}`);
       } else {
           showErrorToast(`บันทึกร่างไม่สำเร็จ: ${errorMessage}`);
       }
       logSystemError(error as Error, 'performSaveDraft', user?.uid, user?.username);
     } finally {
       setIsSaving(false);
     }
  }, [
      formData, 
      user, 
      selectedShift, 
      wards, 
      selectedWard,
      selectedDate, 
      setIsSaving, 
      existingDraftData, 
      setExistingDraftData,
      setMorningShiftStatus, 
      setNightShiftStatus,
      setErrors 
  ]);

   // --- Confirmation Modal Handlers ---
   const handleConfirmSaveDraft = () => {
     performSaveDraft(true); 
   };
 
   const handleCloseConfirmModal = () => {
     setIsConfirmModalOpen(false);
   };

  // --- Finalize Form Logic ---
  const handleFinalizeForm = useCallback(async () => {
    if (!user) {
      showErrorToast('กรุณาเข้าสู่ระบบก่อนบันทึก');
      return;
    }
     if (!selectedWard || !selectedDate) {
       showErrorToast('กรุณาเลือกวอร์ดและวันที่');
       return;
    }

    const validationResult = validateFormData(formData);
    setErrors(validationResult.errors); // Set Record<string, string>

    if (!validationResult.isValid) {
      showErrorToast('ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบ');
      console.error(`Finalize validation failed. isValid: ${validationResult.isValid}`);
      console.error('Finalize validation failed - missingFields:', JSON.stringify(validationResult.missingFields)); // Stringify to force display
      console.error('Finalize validation failed - errors:', JSON.stringify(validationResult.errors)); // Stringify to force display
      return;
    }
    
    if (selectedShift === ShiftType.NIGHT) {
      if (morningShiftStatus !== FormStatus.FINAL && morningShiftStatus !== FormStatus.APPROVED) {
        showErrorToast('ไม่สามารถบันทึกกะดึกได้ เนื่องจากกะเช้ายังไม่ได้บันทึกสมบูรณ์หรืออนุมัติ');
        return;
      }
    }

    setIsSaving(true);
    setErrors({}); // Clear Record<string, string>

    try {
       let finalizedDocId: string | null = null;
       const wardName = wards.find(w => w.id === selectedWard)?.wardName || 'Unknown';
       const draftIdToUse = (existingDraftData?.wardId === selectedWard && 
                             existingDraftData?.dateString === formatDateYMD(new Date(selectedDate + 'T12:00:00')) && 
                             existingDraftData?.shift === selectedShift) 
                            ? existingDraftData.id 
                            : undefined;
       
       const dataToSave = { 
           ...formData, 
           wardName: wardName,
           id: draftIdToUse 
       };

       if (selectedShift === ShiftType.MORNING) {
         finalizedDocId = await finalizeMorningShiftForm(dataToSave, user);
         setMorningShiftStatus(FormStatus.FINAL);
         setIsMorningShiftDisabled(true); 
         if(nightShiftStatus !== FormStatus.FINAL && nightShiftStatus !== FormStatus.APPROVED) { 
              setIsNightShiftDisabled(false);
         }
       } else { // Night Shift
         finalizedDocId = await finalizeNightShiftForm(dataToSave, user);
         setNightShiftStatus(FormStatus.FINAL);
         setIsNightShiftDisabled(true); 
       }
       
       setExistingDraftData(null); 

       showSuccessToast('บันทึกข้อมูลสมบูรณ์สำเร็จ');
       showInfoToast('ข้อมูลจะถูกส่งไปรอการอนุมัติ กรุณารอ Supervisor อนุมัติ');

    } catch (error) {
      console.error('Error finalizing form:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
       if (errorMessage.startsWith('Validation failed:')) {
           showErrorToast(`บันทึกไม่สำเร็จ: ${errorMessage.replace('Validation failed: ', '')}`);
       } else {
          showErrorToast(`บันทึกข้อมูลสมบูรณ์ไม่สำเร็จ: ${errorMessage}`);
       }
      logSystemError(error as Error, 'handleFinalizeForm', user?.uid, user?.username);
    } finally {
      setIsSaving(false);
    }
  }, [
      formData, 
      user, 
      selectedShift, 
      morningShiftStatus, 
      nightShiftStatus,
      setIsSaving, 
      wards,
      selectedWard,
      selectedDate,
      setMorningShiftStatus,
      setNightShiftStatus,
      setIsMorningShiftDisabled,
      setIsNightShiftDisabled,
      setErrors, 
      existingDraftData, 
      setExistingDraftData 
  ]);

  return {
    handleSaveDraft,
    handleFinalizeForm,
    isConfirmModalOpen,
    handleConfirmSaveDraft,
    handleCloseConfirmModal,
  };
}; 