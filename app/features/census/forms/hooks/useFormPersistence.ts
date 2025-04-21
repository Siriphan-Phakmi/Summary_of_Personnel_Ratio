'use client';

import { useState, useCallback } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { Ward } from '@/app/core/types/ward'; // Import Ward type
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
import { showSuccessToast, showErrorToast } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import { createServerTimestamp } from '@/app/core/utils/timestampUtils';

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
  setIsFormReadOnly: React.Dispatch<React.SetStateAction<boolean>>;
  // Functions/State from shift management needed for finalization logic
  morningShiftStatus: FormStatus | null;
  setMorningShiftStatus: React.Dispatch<React.SetStateAction<FormStatus | null>>;
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
  setIsFormReadOnly,
  morningShiftStatus,
  setMorningShiftStatus,
  setNightShiftStatus,
  setIsMorningShiftDisabled,
  setIsNightShiftDisabled,
  isMorningCensusReadOnly
}: UseFormPersistenceProps) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // --- Validation --- 
  const validateForm = useCallback((): boolean => {
    const validationResult = validateFormData(formData);
    const errorMap: Record<string, string> = {};
    validationResult.missingFields.forEach(field => {
      errorMap[field] = `กรุณากรอกข้อมูลช่อง ${field}`;
    });
    setErrors(errorMap);
    
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
    if (!user || !selectedWard) return;

    const currentWard = wards.find(w => w.id === selectedWard);
    if (!currentWard) {
        showErrorToast('ไม่พบข้อมูลวอร์ดที่เลือก');
        return;
    }

    // Check if existing draft conflicts with current selection
    if (existingDraftData && 
        (existingDraftData.dateString !== selectedDate || existingDraftData.shift !== selectedShift)) {
      setIsConfirmModalOpen(true);
    } else {
      await saveFormDraft(formData); // Save directly if no conflict or same draft
    }
  }, [user, selectedWard, wards, existingDraftData, selectedDate, selectedShift, formData]); // Add dependencies

  const saveFormDraft = useCallback(async (dataToSave: Partial<WardForm>) => {
    if (!user || !selectedWard) return;

    const currentWard = wards.find(w => w.id === selectedWard);
    if (!currentWard) {
        showErrorToast('ไม่พบข้อมูลวอร์ดที่เลือก');
        return;
    }

    setIsSaving(true);
    setErrors({});
    setIsConfirmModalOpen(false);

    try {
      const dateTimestamp = Timestamp.fromDate(new Date(selectedDate + 'T00:00:00'));
      const dataWithMeta: Partial<WardForm> = {
        ...dataToSave,
        wardId: selectedWard,
        wardName: currentWard.wardName,
        date: dateTimestamp,
        dateString: selectedDate,
        shift: selectedShift,
        status: FormStatus.DRAFT,
        isDraft: true,
        createdBy: user.uid,
        recorderFirstName: dataToSave.recorderFirstName || user.firstName || '',
        recorderLastName: dataToSave.recorderLastName || user.lastName || '',
        createdAt: dataToSave.createdAt || createServerTimestamp(),
        updatedAt: createServerTimestamp(),
      };

      let docId: string;
      if (selectedShift === ShiftType.MORNING) {
        docId = await saveMorningShiftFormDraft(dataWithMeta, user);
        setMorningShiftStatus(FormStatus.DRAFT); // Update status locally
      } else {
        docId = await saveNightShiftFormDraft(dataWithMeta, user);
        setNightShiftStatus(FormStatus.DRAFT); // Update status locally
      }
      showSuccessToast('บันทึกข้อมูลร่างสำเร็จ');
      setFormData(prev => ({ ...prev, id: docId }));
      // Reload existing draft data after saving
      const latestDraft = await getLatestDraftForm(selectedWard, user);
      setExistingDraftData(latestDraft);

      // Log activity
      await logUserActivity(
        user.uid,
        user.username || 'unknown',
        'save_draft_form',
        { 
          wardId: selectedWard,
          date: selectedDate,
          shift: selectedShift,
          formId: docId
        }
      );

    } catch (error: any) {
      console.error("Error saving draft:", error);
      showErrorToast(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถบันทึกร่างได้'}`);
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedWard, selectedDate, selectedShift, wards, setIsSaving, setErrors, setFormData, setExistingDraftData, setMorningShiftStatus, setNightShiftStatus]);

  // --- Save Final --- 
  const handleSaveFinal = useCallback(async () => {
    if (!user || !selectedWard || !validateForm()) return;

     const currentWard = wards.find(w => w.id === selectedWard);
     if (!currentWard) {
         showErrorToast('ไม่พบข้อมูลวอร์ดที่เลือก');
         return;
     }

    setIsSaving(true);
    setErrors({});

    try {
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dateTimestamp = Timestamp.fromDate(targetDate);
      let calculatedCensus: number | undefined = undefined;
      let finalData: Partial<WardForm> = { ...formData };

       // Calculate census before saving final
       if (selectedShift === ShiftType.MORNING) {
            const previousNightForm = await getPreviousNightShiftForm(targetDate, selectedWard);
            calculatedCensus = calculateMorningCensus(previousNightForm, {
                patientCensus: isMorningCensusReadOnly ? formData.patientCensus : undefined,
                newAdmit: Number(formData.newAdmit ?? 0),
                transferIn: Number(formData.transferIn ?? 0),
                referIn: Number(formData.referIn ?? 0),
                discharge: Number(formData.discharge ?? 0),
                transferOut: Number(formData.transferOut ?? 0),
                referOut: Number(formData.referOut ?? 0),
                dead: Number(formData.dead ?? 0),
            });
       } else {
           const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, selectedWard);
           // Use morningShiftStatus passed from props for check
           if (morningShiftStatus !== FormStatus.FINAL && morningShiftStatus !== FormStatus.APPROVED) {
               throw new Error('ต้องบันทึกข้อมูลกะเช้าให้สมบูรณ์ก่อน');
           }
           if (!morningForm) { // Also check if morning form exists for calculation
               throw new Error('ไม่พบข้อมูลกะเช้าสำหรับคำนวณ');
           }
           calculatedCensus = calculateNightShiftCensus(morningForm, {
               newAdmit: Number(formData.newAdmit ?? 0),
               transferIn: Number(formData.transferIn ?? 0),
               referIn: Number(formData.referIn ?? 0),
               discharge: Number(formData.discharge ?? 0),
               transferOut: Number(formData.transferOut ?? 0),
               referOut: Number(formData.referOut ?? 0),
               dead: Number(formData.dead ?? 0),
           });
       }

       finalData = {
         ...formData,
         totalPatientCensus: calculatedCensus,
         wardId: selectedWard,
         wardName: currentWard.wardName,
         date: dateTimestamp,
         dateString: selectedDate,
         shift: selectedShift,
         status: FormStatus.FINAL,
         isDraft: false,
         createdBy: user.uid,
         recorderFirstName: formData.recorderFirstName || user.firstName || '',
         recorderLastName: formData.recorderLastName || user.lastName || '',
         createdAt: formData.createdAt || createServerTimestamp(),
         updatedAt: createServerTimestamp(),
         finalizedAt: createServerTimestamp(),
       };

      let docId: string;
      if (selectedShift === ShiftType.MORNING) {
        docId = await finalizeMorningShiftForm(finalData, user);
        setMorningShiftStatus(FormStatus.FINAL);
        setIsMorningShiftDisabled(true);
        setIsNightShiftDisabled(false);
      } else {
        // Re-check morning status for safety before finalizing night shift
        const morningStatusCheck = await checkMorningShiftFormStatus(targetDate, selectedWard);
        if (morningStatusCheck.status !== FormStatus.APPROVED) {
          throw new Error('ต้องรออนุมัติข้อมูลกะเช้าก่อน จึงจะบันทึกข้อมูลกะดึกได้');
        }
        docId = await finalizeNightShiftForm(finalData, user);
        setNightShiftStatus(FormStatus.FINAL);
        setIsNightShiftDisabled(true);
      }
      showSuccessToast('บันทึกข้อมูลสมบูรณ์แล้ว ไม่สามารถแก้ไขได้');
      setIsFormReadOnly(true);
      setFormData(prev => ({ ...prev, id: docId, status: FormStatus.FINAL, isDraft: false, totalPatientCensus: calculatedCensus }));

      // Log activity
      await logUserActivity(
        user.uid,
        user.username || 'unknown',
        'save_final_form',
        { 
          wardId: selectedWard,
          date: selectedDate,
          shift: selectedShift,
          formId: docId 
        }
      );

    } catch (error: any) {
      console.error("Error finalizing form:", error);
      showErrorToast(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถบันทึกข้อมูลได้'}`);
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedWard, selectedDate, selectedShift, formData, wards, validateForm, setIsSaving, setErrors, setIsFormReadOnly, setFormData, morningShiftStatus, setMorningShiftStatus, setNightShiftStatus, setIsMorningShiftDisabled, setIsNightShiftDisabled, isMorningCensusReadOnly]);

  return {
    validateForm,
    handleSaveDraft,
    saveFormDraft, // Expose direct save function for modal confirmation
    handleSaveFinal,
    isConfirmModalOpen,
    setIsConfirmModalOpen, // Expose setter for modal control
  };
}; 