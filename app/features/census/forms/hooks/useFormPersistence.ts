'use client';

import { useState, useCallback } from 'react';
import { WardForm, ShiftType, FormStatus, Ward } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { logUserActivity } from '@/app/core/utils/logUtils'; // Import logger
import {
  saveDraftWardForm,
  finalizeMorningShiftForm,
  finalizeNightShiftForm,
  validateFormData,
  getLatestDraftForm // Needed for draft confirmation logic
} from '../services/wardFormService';
import { showSuccessToast, showErrorToast, showInfoToast, showSafeToast, showWarningToast, dismissAllToasts } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import { logSystemError } from '@/app/core/utils/logUtils';
import { formatDateYMD } from '@/app/core/utils/dateUtils';
import { toast } from 'react-hot-toast'; // Import toast directly
import { WarningToast } from '@/app/core/utils/toastUtils'; // Import the specific toast component

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
  isFormDirty: boolean; // NEW: track if form has been modified
}

// Helper function to add basic info needed for validation
const addBasicInfoForValidation = (data: Partial<WardForm>, selectedWard: string, selectedDate: string, selectedShift: ShiftType, wards: Ward[]): Partial<WardForm> => {
    const wardName = wards.find(w => w.id === selectedWard)?.wardName || ''; // Use empty string if not found, validation will catch wardId
    return {
        ...data,
        wardId: selectedWard,
        wardName: wardName, 
        date: selectedDate, // Use the string date selected by user
        shift: selectedShift,
    };
};

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
  isMorningCensusReadOnly,
  isFormDirty, // NEW: destructure the isFormDirty prop
}: UseFormPersistenceProps) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // เพิ่ม state สำหรับควบคุมการกดปุ่มซ้ำ
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(false);
  const [isFinalizeButtonDisabled, setIsFinalizeButtonDisabled] = useState(false);
  
  // กำหนดเวลาที่ปุ่มถูก disable หลังกด (milliseconds)
  const BUTTON_COOLDOWN_TIME = 2500;

  // Helper function to prepare data for validation/saving
  // Converts undefined/null/empty string numeric fields to 0 and ensures core fields are present.
  // Returns an object where numeric fields are explicitly numbers (or 0).
  const prepareDataForSave = (currentFormData: Partial<WardForm>): 
    // Define a more specific return type where numeric fields are numbers
    Omit<Partial<WardForm>, 'patientCensus' | 'nurseManager' | 'rn' | 'pn' | 'wc' | 'newAdmit' | 'transferIn' | 'referIn' | 'transferOut' | 'referOut' | 'discharge' | 'dead' | 'available' | 'unavailable' | 'plannedDischarge'> &
    Required<Pick<WardForm, 'patientCensus' | 'nurseManager' | 'rn' | 'pn' | 'wc' | 'newAdmit' | 'transferIn' | 'referIn' | 'transferOut' | 'referOut' | 'discharge' | 'dead' | 'available' | 'unavailable' | 'plannedDischarge'>> & 
    Pick<WardForm, 'wardId' | 'wardName' | 'shift' | 'dateString'> & { date: string } => { // Include required metadata and move arrow here
    const numericFields: (keyof WardForm)[] = [
        'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
        'newAdmit', 'transferIn', 'referIn',
        'transferOut', 'referOut', 'discharge', 'dead',
        'available', 'unavailable', 'plannedDischarge'
    ];
      
    // Create a new object for the result
    const resultData: any = { ...currentFormData }; // Start with a copy, use any temporarily

    // ปรับวิธีการจัดการกับค่าตัวเลข
    numericFields.forEach(field => {
        const value = currentFormData[field];
        
        // ตรวจสอบค่า 0 ก่อนเป็นพิเศษ
        if (value === 0) {
            resultData[field] = 0; // ค่า 0 ยังคงเป็น 0
        }
        // กรณีไม่มีค่า (undefined, null, empty string)
        else if (value === undefined || value === null || value === '') {
            resultData[field] = 0; // แปลงเป็น 0 เสมอในขั้นตอนการเตรียมข้อมูล (Firestore ไม่ชอบ undefined)
        } 
        // กรณีเป็นสตริง ให้แปลงเป็นตัวเลข
        else if (typeof value === 'string') {
            const num = Number(value);
            resultData[field] = isNaN(num) ? 0 : num; // ถ้าแปลงไม่ได้ให้ใช้ 0
        } 
        // กรณีเป็นตัวเลขอยู่แล้ว
        else if (typeof value === 'number') {
            resultData[field] = value;
        }
        // กรณีอื่นๆ ที่ไม่คาดคิด
        else {
            console.warn(`ประเภทข้อมูลไม่คาดคิดสำหรับฟิลด์ ${field}: ${typeof value}. กำหนดให้เป็น 0`);
            resultData[field] = 0;
        }
    });

    // Ensure necessary metadata is present
    const wardName = wards.find(w => w.id === selectedWard)?.wardName || 'Unknown';
    resultData.wardId = selectedWard;
    resultData.date = selectedDate; // Keep as string yyyy-MM-dd
    resultData.shift = selectedShift;
    resultData.wardName = wardName;
    resultData.dateString = formatDateYMD(new Date(selectedDate + 'T00:00:00'));

    // Cast the final result to the specific return type defined above
    return resultData as (
        Omit<Partial<WardForm>, 'patientCensus' | 'nurseManager' | 'rn' | 'pn' | 'wc' | 'newAdmit' | 'transferIn' | 'referIn' | 'transferOut' | 'referOut' | 'discharge' | 'dead' | 'available' | 'unavailable' | 'plannedDischarge'> &
        Required<Pick<WardForm, 'patientCensus' | 'nurseManager' | 'rn' | 'pn' | 'wc' | 'newAdmit' | 'transferIn' | 'referIn' | 'transferOut' | 'referOut' | 'discharge' | 'dead' | 'available' | 'unavailable' | 'plannedDischarge'>> & 
        Pick<WardForm, 'wardId' | 'wardName' | 'shift' | 'dateString'> & { date: string }
    );
  }

  // --- Validation Callback (using prepareDataForSave) --- 
  const validateFormAndNotify = useCallback((dataToValidate: Partial<WardForm>): boolean => {
    const validationResult = validateFormData(dataToValidate);
    setErrors(validationResult.errors);

    if (!validationResult.isValid) {
      const toastId = 'validation-toast'; // Define the ID

      if (validationResult.missingFields.length > 0) {
        const firstMissingField = validationResult.missingFields[0];
        const fieldLabels: Record<string, string> = {
          patientCensus: 'Patient Census (คงพยาบาล)',
          nurseManager: 'Nurse Manager',
          rn: 'RN (พยาบาลวิชาชีพ)',
          pn: 'PN (พยาบาลเทคนิค)',
          wc: 'WC (ผู้ช่วยเหลือคนไข้)',
          newAdmit: 'New Admit (รับใหม่)',
          transferIn: 'Transfer In (ย้ายเข้า)',
          referIn: 'Refer In (รับส่งต่อ)',
          transferOut: 'Transfer Out (ย้ายออก)',
          referOut: 'Refer Out (ส่งต่อ)',
          discharge: 'Discharge (จำหน่าย)',
          dead: 'Dead (เสียชีวิต)',
          available: 'Available Beds (เตียงว่าง)',
          unavailable: 'Unavailable Beds (เตียงไม่ว่าง)',
          plannedDischarge: 'Planned Discharge (วางแผนจำหน่าย)',
          recorderFirstName: 'ชื่อผู้บันทึก',
          recorderLastName: 'นามสกุลผู้บันทึก',
        };
        const missingFieldNames = validationResult.missingFields
          .map(fieldName => fieldLabels[fieldName as keyof typeof fieldLabels] || fieldName)
          .join(', ');
        
        const toastMessage = `ข้อมูลไม่ครบถ้วน กรุณากรอก: ${missingFieldNames}`;
        
        // Call showSafeToast with the ID option
        showSafeToast(toastMessage, 'warning', { id: `validation-toast-${selectedWard}-${selectedDate}-${selectedShift}` });

        // Attempt to focus on the first missing field
        try {
          const fieldElement = document.querySelector(`[name="${firstMissingField}"]`) as HTMLElement;
          if (fieldElement) {
            setTimeout(() => fieldElement.focus(), 100);
          }
        } catch (e) {
          console.error("Error focusing on element:", e);
        }

      } else {
        // General validation error
        const toastMessage = 'ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบ';
        // Call showSafeToast with the ID option
        showSafeToast(toastMessage, 'warning', { id: `validation-toast-${selectedWard}-${selectedDate}-${selectedShift}` });
      }
      console.error(`Validation failed - errors:`, JSON.stringify(validationResult.errors));
    }

    return validationResult.isValid;
  }, [setErrors]);

  // --- Save Draft --- 
  const handleSaveDraft = useCallback(async (isOverwrite: boolean = false) => {
    if (isSaveButtonDisabled) return;

    // Check if there are actual changes to save
    if (!isFormDirty && !isOverwrite) {
      showSafeToast('ไม่มีการเปลี่ยนแปลงข้อมูล', 'info', { id: `no-changes-${selectedWard}-${selectedDate}-${selectedShift}` });
      console.log('[useFormPersistence] handleSaveDraft aborted: No changes.');
      return;
    }
    // Validate basic form before draft save
    if (!validateFormAndNotify({
        ...addBasicInfoForValidation(formData, selectedWard, selectedDate, selectedShift, wards)
      })) {
      // Invalid inputs, abort save draft
      console.log('[useFormPersistence] handleSaveDraft aborted: Initial validation failed.');
      setIsSaveButtonDisabled(false);
      return;
    }

    setIsSaveButtonDisabled(true); // Disable ทันที

    if (!user || !selectedWard || !selectedDate) {
      // Add ID
      showSafeToast('กรุณาเลือกวอร์ดและวันที่', 'error', { id: `save-draft-selection-error-${selectedWard}-${selectedDate}` });
      setIsSaveButtonDisabled(false); // Re-enable ถ้า check ไม่ผ่าน
      return;
    }

    let dataToValidate: Partial<WardForm> = { ...formData };
    dataToValidate = addBasicInfoForValidation(dataToValidate, selectedWard, selectedDate, selectedShift, wards);

    if (!validateFormAndNotify(dataToValidate)) {
      // ID is added within validateFormAndNotify
      // setTimeout(() => setIsSaveButtonDisabled(false), BUTTON_COOLDOWN_TIME); 
      // We will re-enable the button in the finally block of performSaveDraft or if modal closed without confirm
      return;
    }

    const dataToProcess = prepareDataForSave(dataToValidate);

    const currentTargetDateString = dataToProcess.dateString;
    if (existingDraftData?.wardId === dataToProcess.wardId &&
        existingDraftData?.dateString === currentTargetDateString &&
        existingDraftData?.shift === dataToProcess.shift &&
        !isOverwrite) {
      // Add ID
      showSafeToast('พบข้อมูลร่างของวันนี้อยู่แล้ว คุณต้องการบันทึกทับหรือไม่?', 'warning', { id: `save-draft-overwrite-confirm-${selectedWard}-${selectedDate}-${selectedShift}` });
      setIsConfirmModalOpen(true);
      // Keep button disabled while modal is open
      return;
    }

    await performSaveDraft(dataToProcess, isOverwrite);
    // Re-enabling handled in finally block

  }, [formData, user, selectedWard, selectedDate, selectedShift, existingDraftData, 
      setErrors, wards, isConfirmModalOpen, validateFormAndNotify, prepareDataForSave,
      isSaveButtonDisabled, BUTTON_COOLDOWN_TIME, isFormDirty]); // Added isFormDirty to dependencies

  const performSaveDraft = useCallback(async (dataToSave: Partial<WardForm>, isOverwrite: boolean = false) => {
    if (!user) {
        setIsSaveButtonDisabled(false); // Ensure button is enabled if user check fails early
        return;
    } 

    // isSaveButtonDisabled is already true from handleSaveDraft
    setIsSaving(true);
    setErrors({});

    try {
      // Data passed in (dataToSave) should already have names fixed by handleSaveDraft
      let savedDocId: string | null = null;

      // Prepare data specifically for the service 
      const dataForService = {
           ...dataToSave,
           id: isOverwrite ? existingDraftData?.id : undefined, 
           // REMOVED redundant name setting here, already handled in handleSaveDraft
           createdBy: isOverwrite ? (existingDraftData?.createdBy ?? user.uid) : user.uid,
           // Ensure names passed are trimmed strings
           recorderFirstName: String(dataToSave.recorderFirstName || '').trim(), 
           recorderLastName: String(dataToSave.recorderLastName || '').trim(),
      };

      // เพิ่ม log ข้อมูลที่จะส่งไป save
      console.log('DATA TO SAVE DRAFT:', {
        selectedShift,
        wardId: dataForService.wardId,
        dateString: dataForService.dateString,
        isOverwrite,
        draftId: isOverwrite ? existingDraftData?.id : 'new document'
      });

      // Call the single saveDraftWardForm function regardless of shift
      savedDocId = await saveDraftWardForm(dataForService, user);

      // Update shift status based on the selected shift
      if (selectedShift === ShiftType.MORNING) {
        setMorningShiftStatus(FormStatus.DRAFT);
      } else {
        setNightShiftStatus(FormStatus.DRAFT);
      }
      
      console.log('SAVED DRAFT SUCCESSFULLY, DOC ID:', savedDocId);
      
      // After successful save, update local draft state
      if (savedDocId) {
          // Construct approximate new draft data locally or re-fetch for accuracy
           const approxDate = dataToSave.date ? new Date(dataToSave.date + 'T00:00:00') : new Date();
           // Provide a fallback for createdAt if existingDraftData?.createdAt is undefined
           const approxCreatedAt = isOverwrite ? (existingDraftData?.createdAt ?? new Date()) : new Date(); 

          const newDraftData: WardForm = {
              ...(dataToSave as WardForm), 
              id: savedDocId, 
              status: FormStatus.DRAFT,
              isDraft: true,
              // Use the fallback value
              createdAt: approxCreatedAt, 
              updatedAt: new Date(), // Approximate
              date: approxDate, // Use the date obj approx
          }; 
          setExistingDraftData(newDraftData);
      }

      // Add IDs
      showSafeToast('บันทึกข้อมูลร่างสำเร็จ', 'success', { id: `save-draft-success-${selectedWard}-${selectedDate}-${selectedShift}` });
      // Log user activity for draft save success
      logUserActivity(
        user.uid,
        user.username || user.displayName || '',
        'save_draft_success',
        { wardId: selectedWard, date: selectedDate, shift: selectedShift }
      );
      setIsConfirmModalOpen(false); 
      
    } catch (error) {
      console.error('Error saving draft:', error);
      // เพิ่ม log แสดงรายละเอียด error เพิ่มเติม
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกร่าง';
      if (errorMessage.startsWith('Validation failed:')) {
          showSafeToast(`บันทึกร่างไม่สำเร็จ: ${errorMessage.replace('Validation failed: ', '')}`, 'error', { id: `save-draft-error-${selectedWard}-${selectedDate}-${selectedShift}` });
      } else {
          showSafeToast(`บันทึกร่างไม่สำเร็จ: ${errorMessage}`, 'error', { id: `save-draft-error-${selectedWard}-${selectedDate}-${selectedShift}` });
      }
      logSystemError(error as Error, 'performSaveDraft', user?.uid, user?.username);
      // Log user activity for draft save error
      logUserActivity(
        user?.uid || '',
        user?.username || user?.displayName || '',
        'save_draft_error',
        { wardId: selectedWard, date: selectedDate, shift: selectedShift, error: (error as Error).message }
      );
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setIsSaveButtonDisabled(false);
      }, BUTTON_COOLDOWN_TIME); 
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
     // ไม่ต้อง disable ปุ่มซ้ำ เพราะ performSaveDraft จะจัดการเอง
     performSaveDraft(formData, true); 
   };
 
   const handleCloseConfirmModal = () => {
     setIsConfirmModalOpen(false);
     // Re-enable ปุ่ม save ถ้า modal ถูกปิดโดยไม่กด Confirm
     setIsSaveButtonDisabled(false); 
   };

  // --- Finalize Form Logic ---
  const handleFinalizeForm = useCallback(async () => {
    // Prevent final save if no changes have been made
    if (!isFormDirty) {
      showSafeToast('ไม่มีการเปลี่ยนแปลงข้อมูล', 'info', { id: `no-changes-final-${selectedWard}-${selectedDate}-${selectedShift}` });
      setIsFinalizeButtonDisabled(false);
      return;
    }

    if (isFinalizeButtonDisabled) return;
    setIsFinalizeButtonDisabled(true);

    if (!user || !selectedWard || !selectedDate) {
        // Add ID
        showSafeToast('กรุณาเลือกวอร์ดและวันที่', 'error', { id: `save-final-selection-error-${selectedWard}-${selectedDate}` });
        setIsFinalizeButtonDisabled(false); // Re-enable
        return;
    }
    
    // 1. Prepare data for validation (start with raw form data)
    let dataToValidate: Partial<WardForm> = { ...formData }; 

    // 1a. Add basic info required by validation
    dataToValidate = addBasicInfoForValidation(dataToValidate, selectedWard, selectedDate, selectedShift, wards);

    console.log('[useFormPersistence] handleFinalizeForm: Validating data...', dataToValidate);
    // 2. Validate the data
    if (!validateFormAndNotify(dataToValidate)) {
      // ID is added within validateFormAndNotify
      console.log('[useFormPersistence] handleFinalizeForm aborted: Validation failed.');
      setTimeout(() => setIsFinalizeButtonDisabled(false), BUTTON_COOLDOWN_TIME);
      return;
    }

    // 3. If validation passes, THEN prepare data for ACTUAL saving
    const dataToProcess = prepareDataForSave(dataToValidate);

    // 4. Check morning shift status before finalizing night shift
    if (selectedShift === ShiftType.NIGHT) {
      if (morningShiftStatus !== FormStatus.FINAL && morningShiftStatus !== FormStatus.APPROVED) {
        // Add ID
        showSafeToast('ไม่สามารถบันทึกกะดึกได้ เนื่องจากกะเช้ายังไม่ได้บันทึกสมบูรณ์หรืออนุมัติ', 'warning', { id: `save-final-night-approval-error-${selectedWard}-${selectedDate}` });
        console.log('[useFormPersistence] handleFinalizeForm aborted: Morning shift not finalized/approved.');
        // Re-enable button since we are returning early
        setIsFinalizeButtonDisabled(false);
        return;
      }
    }

    // 5. Proceed with finalization using prepared data
    setIsSaving(true);
    setErrors({}); // ล้าง error

    try {
      let finalizedDocId: string | null = null;
      const wardName = wards.find(w => w.id === selectedWard)?.wardName || 'Unknown';
      const draftIdToUse = (existingDraftData?.wardId === selectedWard && 
                          existingDraftData?.dateString === formatDateYMD(new Date(selectedDate + 'T12:00:00')) && 
                          existingDraftData?.shift === selectedShift) 
                          ? existingDraftData.id 
                          : undefined;
      
      // Ensure data passed to service uses the potentially updated dataToProcess
      const dataToSave = { 
          ...dataToProcess, // Use prepared data
          wardName: wardName,
          id: draftIdToUse, 
          // Ensure names passed are trimmed strings
          recorderFirstName: String(dataToProcess.recorderFirstName || '').trim(),
          recorderLastName: String(dataToProcess.recorderLastName || '').trim(),
      };

      // เพิ่ม log ข้อมูลที่จะส่งไป save
      console.log('DATA TO SAVE FINAL:', {
        selectedShift,
        wardId: dataToSave.wardId,
        dateString: dataToSave.dateString,
        draftIdToUse
      });

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
      
      console.log('SAVED FINAL SUCCESSFULLY, DOC ID:', finalizedDocId);
      
      setExistingDraftData(null); 
      // Add IDs
      // Clear previous toasts and show final success then pending notice in order
      dismissAllToasts();
      showSafeToast('บันทึกข้อมูลสมบูรณ์สำเร็จ', 'success', { id: `save-final-success-${selectedWard}-${selectedDate}-${selectedShift}` });
      // Log user activity for final save success
      logUserActivity(
        user.uid,
        user.username || user.displayName || '',
        'save_final_success',
        { wardId: selectedWard, date: selectedDate, shift: selectedShift }
      );
      showSafeToast('ข้อมูลจะถูกส่งไปรอการอนุมัติ กรุณารอ Supervisor อนุมัติ', 'info', { id: `save-final-pending-approval-${selectedWard}-${selectedDate}-${selectedShift}` });
      
      // เพิ่มการแจ้งเตือนเกี่ยวกับการสร้าง Daily Summary เมื่อกรอกกะดึกเสร็จสมบูรณ์
      if (selectedShift === ShiftType.NIGHT) {
        showSafeToast('ระบบได้สร้างสรุปข้อมูลประจำวันเรียบร้อยแล้ว', 'info', { id: `daily-summary-created-${selectedWard}-${selectedDate}` });
      }

    } catch (error) {
      console.error('Error finalizing form:', error);
      // เพิ่ม log แสดงรายละเอียด error เพิ่มเติม
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      if (errorMessage.startsWith('Validation failed:')) {
          showSafeToast(`บันทึกไม่สำเร็จ: ${errorMessage.replace('Validation failed: ', '')}`, 'error', { id: `save-final-error-${selectedWard}-${selectedDate}-${selectedShift}` });
      } else {
          showSafeToast(`บันทึกข้อมูลสมบูรณ์ไม่สำเร็จ: ${errorMessage}`, 'error', { id: `save-final-error-${selectedWard}-${selectedDate}-${selectedShift}` });
      }
      logSystemError(error as Error, 'handleFinalizeForm', user?.uid, user?.username);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
          setIsFinalizeButtonDisabled(false);
      }, BUTTON_COOLDOWN_TIME);
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
      setExistingDraftData,
      validateFormAndNotify,
      isFinalizeButtonDisabled,
      BUTTON_COOLDOWN_TIME,
      isFormDirty
  ]);

  return {
    handleSaveDraft,
    handleFinalizeForm,
    isConfirmModalOpen,
    handleConfirmSaveDraft,
    handleCloseConfirmModal,
    isSaveButtonDisabled,
    isFinalizeButtonDisabled
  };
}; 