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
  getLatestDraftForm // Needed for draft confirmation logic
} from '../services/wardFormService';
import { showSuccessToast, showErrorToast, showInfoToast, showSafeToast } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import { logSystemError } from '@/app/core/utils/logUtils';
import { formatDateYMD } from '@/app/core/utils/dateUtils';

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
  
  // เพิ่ม state สำหรับควบคุมการกดปุ่มซ้ำ
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(false);
  const [isFinalizeButtonDisabled, setIsFinalizeButtonDisabled] = useState(false);
  
  // กำหนดเวลาที่ปุ่มถูก disable หลังกด (milliseconds)
  const BUTTON_COOLDOWN_TIME = 1200;

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

    numericFields.forEach(field => {
        const value = currentFormData[field];
        // Convert undefined/null/empty string numeric fields to 0
        if (value === undefined || value === null || value === '') {
            resultData[field] = 0; 
        } else if (typeof value === 'string') {
            const num = Number(value);
            resultData[field] = isNaN(num) ? 0 : num; // Fallback to 0 if conversion fails
        } else {
            // Assume it's already a number if not undefined/null/string
            resultData[field] = value;
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
  const validateForm = useCallback((dataToValidate: Partial<WardForm>): boolean => {
    // เรียกใช้ validateFormData เพื่อตรวจสอบข้อมูล
    const validationResult = validateFormData(dataToValidate);
    setErrors(validationResult.errors);
    
    if (!validationResult.isValid && validationResult.missingFields.length > 0) {
      const firstMissingField = validationResult.missingFields[0];
      // ใช้ข้อความ error จากผลการตรวจสอบ
      const errorMsg = validationResult.errors[firstMissingField] || 'ข้อมูลไม่ถูกต้อง';
      showSafeToast(`${errorMsg}`, 'error');

      // พยายาม focus ที่ช่อง input แรกที่มีข้อผิดพลาด
      try {
        const fieldElement = document.querySelector(`[name="${firstMissingField}"]`) as HTMLElement;
        if (fieldElement) {
          // เพิ่มการหน่วงเวลาเล็กน้อย
          setTimeout(() => fieldElement.focus(), 100);
        }
      } catch (e) {
        console.error("Error focusing on element:", e);
      }
    }
    
    return validationResult.isValid;
  }, [setErrors]); 

  // --- Save Draft --- 
  const handleSaveDraft = useCallback(async (isOverwrite: boolean = false) => {
    // ป้องกันการกดปุ่มซ้ำ
    if (isSaveButtonDisabled) return;
    
    setIsSaveButtonDisabled(true);
    
    // ตั้งเวลาเพื่อเปิดปุ่มอีกครั้งหลังจากเวลาที่กำหนด
    setTimeout(() => {
      setIsSaveButtonDisabled(false);
    }, BUTTON_COOLDOWN_TIME);
    
    if (!user) {
      showSafeToast('กรุณาเข้าสู่ระบบก่อนบันทึก', 'error');
      return;
    }
    if (!selectedWard || !selectedDate) {
       showSafeToast('กรุณาเลือกวอร์ดและวันที่', 'error');
       return;
    }

    // จัดเตรียมข้อมูล (แปลงค่า undefined เป็น 0)
    const dataToProcess = prepareDataForSave(formData); 

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!validateForm(dataToProcess)) { 
        showSafeToast('ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบและกรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
        return; // หยุดถ้าข้อมูลไม่ถูกต้อง
    }
    
    // ตรวจสอบ draft ที่มีอยู่
    const currentTargetDateString = dataToProcess.dateString; 
    if (existingDraftData?.wardId === dataToProcess.wardId && 
        existingDraftData?.dateString === currentTargetDateString && 
        existingDraftData?.shift === dataToProcess.shift &&
        !isOverwrite) { 
      showSafeToast('พบข้อมูลร่างของวันนี้อยู่แล้ว คุณต้องการบันทึกทับหรือไม่?', 'warning');
      setIsConfirmModalOpen(true); 
      return; 
    }

    await performSaveDraft(dataToProcess, isOverwrite);

  }, [formData, user, selectedWard, selectedDate, selectedShift, existingDraftData, 
      setErrors, wards, isConfirmModalOpen, validateForm, prepareDataForSave, 
      isSaveButtonDisabled, BUTTON_COOLDOWN_TIME]);

  const performSaveDraft = useCallback(async (dataToSave: Partial<WardForm>, isOverwrite: boolean = false) => {
     if (!user) return; 
     
     setIsSaving(true);
     setErrors({}); // Clear errors before saving attempt
     
     try {
       // Data passed in (dataToSave) is already prepared (undefined -> 0)
       // Call the appropriate service function
       let savedDocId: string | null = null;

       // Prepare data specifically for the service (may involve timestamp conversions etc. handled within the service now)
       const dataForService = {
            ...dataToSave,
            // Pass existing draft ID for potential overwrite logic within the service if needed
            // Or rely on setDoc merge:true within service
            id: isOverwrite ? existingDraftData?.id : undefined, 
             // Ensure user details are passed correctly
            recorderFirstName: dataToSave.recorderFirstName || user.firstName || '',
            recorderLastName: dataToSave.recorderLastName || user.lastName || '',
            createdBy: isOverwrite ? (existingDraftData?.createdBy ?? user.uid) : user.uid,
            // Service will handle timestamps (createdAt, updatedAt)
       };

       if (selectedShift === ShiftType.MORNING) {
         // Pass the prepared data and user to the service function
         savedDocId = await saveMorningShiftFormDraft(dataForService, user);
         setMorningShiftStatus(FormStatus.DRAFT); 
       } else {
         savedDocId = await saveNightShiftFormDraft(dataForService, user);
         setNightShiftStatus(FormStatus.DRAFT); 
       }
       
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

       showSafeToast('บันทึกข้อมูลร่างสำเร็จ', 'success');
       setIsConfirmModalOpen(false); 
       
     } catch (error) {
       console.error('Error saving draft:', error);
       const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกร่าง';
       if (errorMessage.startsWith('Validation failed:')) {
           showSafeToast(`บันทึกร่างไม่สำเร็จ: ${errorMessage.replace('Validation failed: ', '')}`, 'error');
       } else {
           showSafeToast(`บันทึกร่างไม่สำเร็จ: ${errorMessage}`, 'error');
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
     performSaveDraft(formData, true); 
   };
 
   const handleCloseConfirmModal = () => {
     setIsConfirmModalOpen(false);
   };

  // --- Finalize Form Logic ---
  const handleFinalizeForm = useCallback(async () => {
    // ป้องกันการกดปุ่มซ้ำ
    if (isFinalizeButtonDisabled) return;
    
    setIsFinalizeButtonDisabled(true);
    
    // ตั้งเวลาเพื่อเปิดปุ่มอีกครั้งหลังจากเวลาที่กำหนด
    setTimeout(() => {
      setIsFinalizeButtonDisabled(false);
    }, BUTTON_COOLDOWN_TIME);
  
    if (!user) {
      showSafeToast('กรุณาเข้าสู่ระบบก่อนบันทึก', 'error');
      return;
    }
    if (!selectedWard || !selectedDate) {
      showSafeToast('กรุณาเลือกวอร์ดและวันที่', 'error');
      return;
    }

    // จัดเตรียมข้อมูล (แปลงค่า undefined เป็น 0)
    const dataToProcess = prepareDataForSave(formData);

    // ตรวจสอบความถูกต้องของข้อมูล
    const validationResult = validateFormData(dataToProcess);
    setErrors(validationResult.errors);

    if (!validationResult.isValid) {
      const missingFieldNames = validationResult.missingFields.map(fieldName => {
        // แปลงชื่อ field เป็นชื่อที่เข้าใจง่าย
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
        return fieldLabels[fieldName as keyof typeof fieldLabels] || fieldName;
      }).join(', ');

      showSafeToast(`ข้อมูลไม่ครบถ้วน กรุณากรอก: ${missingFieldNames}`, 'warning');
      
      // พยายาม focus ที่ช่อง input แรกที่มีข้อผิดพลาด
      if (validationResult.missingFields.length > 0) {
        try {
          const fieldElement = document.querySelector(`[name="${validationResult.missingFields[0]}"]`) as HTMLElement;
          if (fieldElement) {
            // เพิ่มการหน่วงเวลาเล็กน้อย
            setTimeout(() => fieldElement.focus(), 100);
          }
        } catch (e) {
          console.error("Error focusing on element:", e);
        }
      }
      
      console.error(`Finalize validation failed. isValid: ${validationResult.isValid}`);
      console.error('Finalize validation failed - missingFields:', JSON.stringify(validationResult.missingFields));
      console.error('Finalize validation failed - errors:', JSON.stringify(validationResult.errors));
      return;
    }
    
    if (selectedShift === ShiftType.NIGHT) {
      if (morningShiftStatus !== FormStatus.FINAL && morningShiftStatus !== FormStatus.APPROVED) {
        showSafeToast('ไม่สามารถบันทึกกะดึกได้ เนื่องจากกะเช้ายังไม่ได้บันทึกสมบูรณ์หรืออนุมัติ', 'warning');
        return;
      }
    }

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
      
      const dataToSave = { 
          ...dataToProcess, 
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

      showSafeToast('บันทึกข้อมูลสมบูรณ์สำเร็จ', 'success');
      showSafeToast('ข้อมูลจะถูกส่งไปรอการอนุมัติ กรุณารอ Supervisor อนุมัติ', 'info');

    } catch (error) {
      console.error('Error finalizing form:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      if (errorMessage.startsWith('Validation failed:')) {
          showSafeToast(`บันทึกไม่สำเร็จ: ${errorMessage.replace('Validation failed: ', '')}`, 'error');
      } else {
          showSafeToast(`บันทึกข้อมูลสมบูรณ์ไม่สำเร็จ: ${errorMessage}`, 'error');
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
      setExistingDraftData,
      validateForm,
      prepareDataForSave,
      isFinalizeButtonDisabled,
      BUTTON_COOLDOWN_TIME
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