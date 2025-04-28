'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { 
  getWardForm, 
  getLatestPreviousNightForm, 
  getLatestDraftForm,
  saveMorningShiftFormDraft,
  saveNightShiftFormDraft,
  finalizeMorningShiftForm,
  finalizeNightShiftForm
} from '../services/wardFormService';
import { showInfoToast, showErrorToast, showSafeToast } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

// Revert initialFormData to represent the actual data structure (numbers)
// We'll handle the empty display in the component
const initialFormStructure: Partial<WardForm> = {
  patientCensus: undefined, // Use undefined for optional number fields initially
  nurseManager: undefined,
  rn: undefined,
  pn: undefined,
  wc: undefined,
  newAdmit: undefined,
  transferIn: undefined,
  referIn: undefined,
  transferOut: undefined,
  referOut: undefined,
  discharge: undefined,
  dead: undefined,
  available: undefined,
  unavailable: undefined,
  plannedDischarge: undefined,
  comment: '',
  recorderFirstName: '',
  recorderLastName: '',
  status: FormStatus.DRAFT,
  isDraft: true
};

interface UseWardFormDataProps {
  selectedWard: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  morningShiftStatus: FormStatus | null; // Pass status from shift management
  nightShiftStatus: FormStatus | null;   // Pass status from shift management
}

export const useWardFormData = ({
  selectedWard,
  selectedDate,
  selectedShift,
  user,
  morningShiftStatus,
  nightShiftStatus,
}: UseWardFormDataProps) => {
  const [formData, setFormData] = useState<Partial<WardForm>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Separate state for saving actions
  const [isMorningCensusReadOnly, setIsMorningCensusReadOnly] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(false);
  const [isCensusAutoCalculated, setIsCensusAutoCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null); // General error state
  const [isDraftLoaded, setIsDraftLoaded] = useState(false); // Indicates if CURRENTLY displayed data is a loaded draft
  const [isFinalDataFound, setIsFinalDataFound] = useState(false); // NEW: Indicates if FINAL data exists for the selection
  const [isFormDirty, setIsFormDirty] = useState(false); // NEW: track if form has been modified
  const [showConfirmOverwriteModal, setShowConfirmOverwriteModal] = useState(false); // NEW: State for confirmation modal

  // Store previous selection to prevent unnecessary reloads if only shift changes
  const prevSelectionRef = useRef({ ward: selectedWard, date: selectedDate });

  useEffect(() => {
    // Determine if the core selection (ward/date) or user has changed
    const selectionChanged = 
        prevSelectionRef.current.ward !== selectedWard || 
        prevSelectionRef.current.date !== selectedDate;

    // Only reset form/errors/dirty status if ward/date selection changed, 
    // not just the shift or user object reference (if user data itself didn't change identity)
    if (selectionChanged) {
        setError(null);
        setErrors({});
        setIsFormDirty(false);
        // Reset form data ONLY when ward/date changes significantly
        setFormData({}); 
        // Update the ref for the next comparison
        prevSelectionRef.current = { ward: selectedWard, date: selectedDate };
    }

    // --- Load data logic --- 
    const loadData = async () => {
        // *** CRITICAL CHECK: Ensure all required IDs/data are present before proceeding ***
        if (!selectedWard || !selectedDate || !user?.uid) {
            console.log('[useWardFormData] Skipping loadData: Missing selectedWard, selectedDate, or user.uid');
            setIsLoading(false); // Ensure loading is false if we skip
            // Consider setting a specific state or error if this persists unexpectedly
            return; 
        }
        
        console.log(`[useWardFormData] Starting loadData for ${selectedWard}, ${selectedDate}, ${selectedShift}`);
        setIsLoading(true);
        // Reset specific states related to loaded data properties before fetch
        // DO NOT reset formData here, reset happens above only on ward/date change
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setIsCensusAutoCalculated(false);
        setIsDraftLoaded(false);
        setIsFinalDataFound(false);
        // Keep isFormDirty as is, reset only on selection change or successful save

        try {
            const targetDate = new Date(selectedDate + 'T00:00:00');
            const dateTimestamp = Timestamp.fromDate(targetDate);
            let loadedData: Partial<WardForm> | null = null; // To store the data loaded for the current shift

            // 1. Fetch Existing Form Data for the selected date and shift FIRST
            const existingForm = await getWardForm(dateTimestamp, selectedShift, selectedWard);
            console.log('[useWardFormData] Checked for existing form:', existingForm?.status);

            if (existingForm) {
                const isFinal = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
                const isDraft = existingForm.status === FormStatus.DRAFT;

                // Prepare base loaded data structure
                loadedData = {
                    ...existingForm,
                    date: existingForm.date instanceof Timestamp ? format(existingForm.date.toDate(), 'yyyy-MM-dd') : existingForm.date,
                    // Ensure numbers are numbers or undefined
                    patientCensus: Number(existingForm.patientCensus ?? undefined),
                    nurseManager: Number(existingForm.nurseManager ?? undefined),
                    rn: Number(existingForm.rn ?? undefined),
                    pn: Number(existingForm.pn ?? undefined),
                    wc: Number(existingForm.wc ?? undefined),
                    newAdmit: Number(existingForm.newAdmit ?? undefined),
                    transferIn: Number(existingForm.transferIn ?? undefined),
                    referIn: Number(existingForm.referIn ?? undefined),
                    transferOut: Number(existingForm.transferOut ?? undefined),
                    referOut: Number(existingForm.referOut ?? undefined),
                    discharge: Number(existingForm.discharge ?? undefined),
                    dead: Number(existingForm.dead ?? undefined),
                    available: Number(existingForm.available ?? undefined),
                    unavailable: Number(existingForm.unavailable ?? undefined),
                    plannedDischarge: Number(existingForm.plannedDischarge ?? undefined),
                };

                 // Set recorder names based on status and user
                 if (user) {
                    if (!isFinal) { // If draft, use loaded name if exists, else current user
                        loadedData.recorderFirstName = loadedData.recorderFirstName?.trim() ? loadedData.recorderFirstName : (user.firstName || '');
                        loadedData.recorderLastName = loadedData.recorderLastName?.trim() ? loadedData.recorderLastName : (user.lastName || '');
                    } else { // If final/approved, just ensure string values
                        loadedData.recorderFirstName = loadedData.recorderFirstName || '';
                        loadedData.recorderLastName = loadedData.recorderLastName || '';
                    }
                }

                if (isFinal) {
                    console.log('[useWardFormData] FINAL data found.');
                    setIsFinalDataFound(true);
                    setIsFormReadOnly(true); // Read-only if Final/Approved
                    setIsDraftLoaded(false);
                    // Use specific ID for toast
                    showSafeToast(`ข้อมูลบันทึกสมบูรณ์/อนุมัติสำหรับกะนี้ ถูกโหลดแล้ว (อ่านอย่างเดียว)`, 'info', { id: `load-final-${selectedWard}-${selectedDate}-${selectedShift}` });
                    
                    // For morning shift final data, the census value is already loaded,
                    // determine read-only based on whether it was auto-calculated (though it should match the saved value)
                     if (selectedShift === ShiftType.MORNING) {
                         // Check if the loaded value matches what would have been auto-calculated
                         // This logic might need refinement depending on exact requirements for re-calculating display
                         setIsMorningCensusReadOnly(true); // If final, it's read-only
                         setIsCensusAutoCalculated(true); // Assume it was auto-calculated if final/morning? Or check previous night? Keep simple for now.
                     }

                } else if (isDraft) {
                    console.log('[useWardFormData] DRAFT data found and loaded.');
                    setIsFinalDataFound(false);
                    setIsFormReadOnly(false); // Editable if Draft
                    setIsDraftLoaded(true); // Set flag indicating current data is a loaded draft
                    // Use specific ID for toast
                    showSafeToast("กำลังแสดงข้อมูลฉบับร่างที่มีอยู่สำหรับกะนี้", 'warning', { id: `load-draft-${selectedWard}-${selectedDate}-${selectedShift}` }); // Use warning color for draft
                     if (selectedShift === ShiftType.MORNING) {
                        // If draft for morning, it's editable, census not forced read-only from previous night
                        setIsMorningCensusReadOnly(false);
                        setIsCensusAutoCalculated(false); // Don't auto-calculate display if loading draft
                    }
                }
                setFormData(loadedData);
                setIsFormDirty(false); // Data just loaded is not dirty

            } else {
                 console.log('[useWardFormData] No existing form found for this shift.');
                 // No existing data for the current shift, proceed to check previous night for Morning shift
                 setIsFinalDataFound(false);
                 setIsFormReadOnly(false);
                 setIsDraftLoaded(false);
                 loadedData = null; // Ensure loadedData is null

                 let initialData = {
                    ...initialFormStructure,
                    recorderFirstName: user?.firstName || '',
                    recorderLastName: user?.lastName || '',
                 };

                 if (selectedShift === ShiftType.MORNING) {
                    let previousNightForm: WardForm | null = null;
                    try {
                       previousNightForm = await getLatestPreviousNightForm(targetDate, selectedWard);
                    } catch (prevNightError) {
                         console.error("Error fetching previous night form:", prevNightError);
                         // Use specific ID for toast
                         showSafeToast('เกิดข้อผิดพลาดในการดึงข้อมูลกะกลางคืนก่อนหน้า', 'error', { id: `load-prev-night-error-${selectedWard}-${selectedDate}` });
                    }

                    if (previousNightForm?.patientCensus !== undefined) {
                        if (previousNightForm.status === FormStatus.APPROVED) {
                            initialData.patientCensus = Number(previousNightForm.patientCensus);
                            setIsMorningCensusReadOnly(true);
                            setIsCensusAutoCalculated(true);
                            // Use specific ID for toast
                            showSafeToast('Patient Census ถูกดึงจากข้อมูลกะดึก (อนุมัติแล้ว)', 'info', { id: `load-prev-night-census-${selectedWard}-${selectedDate}` });
                        } else {
                             setIsMorningCensusReadOnly(false);
                             setIsCensusAutoCalculated(false);
                             // Use specific ID for toast
                             const message = previousNightForm.status === FormStatus.FINAL
                                 ? 'ข้อมูล Save Final กะดึกยังไม่ได้ Approval กรุณาติดต่อฝ่ายการ/Surveyor'
                                 : previousNightForm.status === FormStatus.DRAFT
                                     ? 'ข้อมูล Save Draft กะดึกยังไม่สมบูรณ์/อนุมัติ'
                                     : 'ข้อมูลกะดึกยังไม่สมบูรณ์/อนุมัติ';
                             showSafeToast(`${message}. Patient Census จะไม่ถูกโหลดอัตโนมัติ`, 'warning', { id: `load-prev-night-status-${selectedWard}-${selectedDate}` });
                        }
                    } else {
                         setIsMorningCensusReadOnly(false);
                         setIsCensusAutoCalculated(false);
                         // Use specific ID for toast
                         showSafeToast('ไม่พบข้อมูล Patient Census จากกะดึกคืนก่อน', 'warning', { id: `load-prev-night-missing-${selectedWard}-${selectedDate}` });
                    }
                 } else {
                     // Night shift, no previous night logic needed here
                     setIsMorningCensusReadOnly(false);
                     setIsCensusAutoCalculated(false);
                 }
                 setFormData(initialData); // Set initial data (possibly with auto-census)
                 setIsFormDirty(false); // Initial data is not dirty
            }

        } catch (err) { // Catch block for the main try
          console.error("Error in loadData:", err);
          // Use specific ID for toast
          showSafeToast('เกิดข้อผิดพลาดในการโหลดข้อมูลฟอร์ม', 'error', { id: `load-error-${selectedWard}-${selectedDate}-${selectedShift}` });
          setFormData({ // Reset to minimal initial state on error
            ...initialFormStructure,
             recorderFirstName: user?.firstName || '',
             recorderLastName: user?.lastName || '',
          });
          // Reset all relevant states on error
          setIsMorningCensusReadOnly(false);
          setIsFormReadOnly(false);
          setIsCensusAutoCalculated(false);
          setIsDraftLoaded(false);
          setIsFinalDataFound(false);
          setIsFormDirty(false); // Ensure dirty is false on load error
          setError((err as Error).message);
        } finally {
          setIsLoading(false);
        }
    };

    // Trigger loadData when dependencies are ready
    loadData();

  }, [selectedWard, selectedDate, selectedShift, user]); // Dependencies remain the same

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | undefined;

    if (type === 'number') {
      // Allow empty string to clear the field, store as undefined
      if (value === '') {
        processedValue = undefined;
      } else if (!isNaN(Number(value)) && Number(value) >= 0) {
        // Check if it's a non-negative number
        // Use Number() to handle leading zeros correctly (e.g., "05" becomes 5)
        processedValue = Number(value);
      } else {
        // Invalid input (not a number, negative, or other characters)
        // Prevent updating the state with invalid numeric values
        console.warn(`[handleChange] Invalid number input ignored for field "${name}":`, value);
        return; // Stop the update for invalid number input
      }
    } else {
      // For non-number types, use the value directly
      processedValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
      // Automatically update isDraft flag when user edits
      isDraft: true,
      status: FormStatus.DRAFT, // Ensure status reflects draft when editing
    }));

    // Set form as dirty when user makes changes
    setIsFormDirty(true);

    // Clear the error for the field being changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (finalSave: boolean = false): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    const requiredNumberFields: (keyof WardForm)[] = [
      'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
      'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut',
      'discharge', 'dead', 'available', 'unavailable', 'plannedDischarge'
    ];

     const requiredStringFields: (keyof WardForm)[] = ['recorderFirstName', 'recorderLastName'];

    // Validate required number fields only if doing a final save
    if (finalSave) {
        requiredNumberFields.forEach(field => {
          const value = formData[field];
          // Check if undefined, null, or empty string after trimming (though state uses undefined now)
          if (value === undefined || value === null || value === '') {
             // Special case: Allow patientCensus to be 0 even if required
             if (field === 'patientCensus' && value === 0) {
               // Valid
             } else {
                newErrors[field] = 'กรุณากรอกข้อมูล';
                isValid = false;
             }
          } else if (typeof value === 'number' && value < 0) {
             newErrors[field] = 'ค่าต้องไม่ติดลบ';
             isValid = false;
          }
        });

        requiredStringFields.forEach(field => {
             const value = formData[field];
             if (!value || (typeof value === 'string' && value.trim() === '')) {
                newErrors[field] = 'กรุณากรอกข้อมูล';
                isValid = false;
             }
        });
    }
    // For Draft save, we generally don't require all fields, but numbers should still be non-negative if entered
     else {
        requiredNumberFields.forEach(field => {
          const value = formData[field];
          if (value !== undefined && value !== null && typeof value === 'number' && value < 0) {
            newErrors[field] = 'ค่าต้องไม่ติดลบ';
            isValid = false;
          }
        });
     }

    setErrors(newErrors);
    return isValid;
  };

  // NEW: Function to actually perform the save draft operation
  const proceedToSaveDraft = async () => {
    // Ensure user context is still valid if needed, though handled in handleSaveDraft already
    if (!user) {
         showErrorToast('User information is missing.');
         return;
    }
    
    // Validation is already done in handleSaveDraft before calling this
    setIsSaving(true);
    setError(null); // Clear previous errors

    try {
      // กรองค่า undefined ออกโดยแปลงเป็น null ก่อนส่งไปบันทึก
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      const dataToSave: Partial<WardForm> = {
        ...cleanFormData,
        date: Timestamp.fromDate(new Date(selectedDate + 'T00:00:00')),
        shift: selectedShift,
        status: FormStatus.DRAFT,
        isDraft: true,
        createdBy: user?.uid || '', // Add user info
        updatedAt: Timestamp.now(), // Add timestamp
        // Ensure recorder names are included from state
        recorderFirstName: formData.recorderFirstName || user?.firstName || '',
        recorderLastName: formData.recorderLastName || user?.lastName || '',
        // ข้อมูลสำหรับการบันทึก
        wardId: selectedWard,
        // หาชื่อ Ward จากที่มีอยู่แล้วแนบไปด้วย
        wardName: formData.wardName || '', // Assuming wardName is populated in formData somehow or fetched elsewhere
      };
      
      let docId = '';
      // เลือกใช้ฟังก์ชันตาม shift
      if (selectedShift === ShiftType.MORNING) {
        docId = await saveMorningShiftFormDraft(dataToSave, user);
      } else if (selectedShift === ShiftType.NIGHT) {
        docId = await saveNightShiftFormDraft(dataToSave, user);
      } else {
        throw new Error('ข้อมูล Shift ไม่ถูกต้อง');
      }

      // แสดง notification เฉพาะเมื่อมีข้อมูลจริงๆ
      showInfoToast('บันทึกฉบับร่างสำเร็จ');
      setIsFormDirty(false); // Reset dirty status after successful save
      setIsDraftLoaded(true); // Ensure draft loaded status is true after saving draft
      setShowConfirmOverwriteModal(false); // Close modal on success

    } catch (err) {
      console.error("Error saving draft:", err);
      showErrorToast(`เกิดข้อผิดพลาดในการบันทึกฉบับร่าง: ${(err as Error).message}`);
      // Keep modal open on error? Or close? Let's close it for now.
      // setShowConfirmOverwriteModal(false); 
    } finally {
      setIsSaving(false);
    }
  };

  // MODIFIED: handleSaveDraft to include confirmation logic
  const handleSaveDraft = async () => {
    if (isFormReadOnly) {
      showErrorToast('ไม่สามารถบันทึกร่างข้อมูลที่ Finalized แล้วได้');
      return;
    }

    // *** ใช้ validateForm(true) เหมือนเดิม เพื่อตรวจสอบความครบถ้วนก่อนเสมอ ***
    if (!validateForm(true)) { 
      showErrorToast('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วนและถูกต้องก่อนบันทึกร่าง');
      // No need to set isSaving here as we haven't started the async operation
      return;
    }
    
    // Check if we are overwriting an existing draft that has been modified
    if (isDraftLoaded && isFormDirty) {
       setShowConfirmOverwriteModal(true); // Show confirmation modal
    } else {
       // If it's a new draft or an existing draft that hasn't been modified (though save button should be disabled), proceed directly
       await proceedToSaveDraft(); 
    }
  };

  const handleSaveFinal = async () => {
    if (isFormReadOnly) {
      showErrorToast('ข้อมูลนี้ถูกบันทึกสมบูรณ์แล้ว ไม่สามารถแก้ไขได้');
      return;
    }

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!validateForm(true)) {
      showErrorToast('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วนและถูกต้อง');
      return;
    }
    
    // ตรวจสอบชื่อและนามสกุลผู้บันทึก
    const recorderFirstName = formData.recorderFirstName || '';
    const recorderLastName = formData.recorderLastName || '';
    
    // ตรวจสอบว่าชื่อและนามสกุลไม่ว่างเปล่า
    if (recorderFirstName.trim() === '' || recorderLastName.trim() === '') {
      showErrorToast('กรุณากรอกชื่อและนามสกุลของผู้บันทึกให้ครบถ้วน');
      return;
    }
    
    // ตรวจสอบว่ามีข้อมูลหลักที่จำเป็นครบถ้วนหรือไม่
    const requiredNumericFields = ['patientCensus', 'nurseManager', 'rn', 'pn', 'wc'] as const;
    const hasAllRequiredData = requiredNumericFields.every(field => {
      const value = formData[field];
      return value !== undefined && value !== null;
    });
    
    if (!hasAllRequiredData) {
      showErrorToast('กรุณากรอกข้อมูลหลักทั้งหมดให้ครบถ้วนก่อนบันทึกสมบูรณ์');
      return;
    }

    // ตรวจสอบข้อมูลรองที่จำเป็นในการบันทึกสมบูรณ์
    const otherRequiredFields = ['newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead', 'available', 'unavailable'] as const;
    const otherFieldsCount = otherRequiredFields.filter(field => {
      const value = formData[field];
      return value !== undefined && value !== null;
    }).length;
    
    // ต้องกรอกฟิลด์รองอย่างน้อย 70% (7 จาก 9 ฟิลด์)
    const minOtherFields = Math.ceil(otherRequiredFields.length * 0.7);
    
    if (otherFieldsCount < minOtherFields) {
      showErrorToast(`กรุณากรอกข้อมูลรองให้ครบถ้วนมากขึ้น (อย่างน้อย ${minOtherFields} รายการจาก ${otherRequiredFields.length} รายการ)`);
      return;
    }
    
    setIsSaving(true);
    try {
      // กรองค่า undefined ออกโดยแปลงเป็น null ก่อนส่งไปบันทึก
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      const dataToSave: Partial<WardForm> = {
        ...cleanFormData,
        date: Timestamp.fromDate(new Date(selectedDate + 'T00:00:00')),
        shift: selectedShift,
        status: FormStatus.FINAL, // Set status to FINAL
        isDraft: false,          // Set isDraft to false
        createdBy: user?.uid || '', // Add user info
        updatedAt: Timestamp.now(), // Add timestamp
        finalizedAt: Timestamp.now(), // Add finalized timestamp
        // Ensure recorder names are included
        recorderFirstName: formData.recorderFirstName || '', // Should be validated
        recorderLastName: formData.recorderLastName || '', // Should be validated
        // ข้อมูลสำหรับการบันทึก
        wardId: selectedWard,
        // หาชื่อ Ward จากที่มีอยู่แล้วแนบไปด้วย
        wardName: formData.wardName || '',
      };

      let docId = '';
      // เลือกใช้ฟังก์ชันตาม shift
      if (selectedShift === ShiftType.MORNING && user) {
        docId = await finalizeMorningShiftForm(dataToSave, user);
      } else if (selectedShift === ShiftType.NIGHT && user) {
        docId = await finalizeNightShiftForm(dataToSave, user);
      } else {
        throw new Error('ข้อมูล Shift หรือ User ไม่ถูกต้อง');
      }
      
      // แสดง notification เมื่อบันทึกสำเร็จ
      showSafeToast('บันทึกข้อมูลสมบูรณ์ (Final) สำเร็จ!', 'success');
      setIsFormReadOnly(true); // Make form read-only after successful final save
      setIsFormDirty(false); // Reset dirty status after successful final save

    } catch (err) {
      console.error("Error saving final:", err);
      showErrorToast(`เกิดข้อผิดพลาดในการบันทึกข้อมูลสมบูรณ์: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    errors,
    isLoading,
    isSaving,
    isMorningCensusReadOnly,
    isFormReadOnly, // Use this based on isFinalDataFound
    isCensusAutoCalculated,
    handleChange,
    handleSaveDraft, // Keep this name for the initial trigger
    handleSaveFinal,
    validateForm,
    error, // Pass general error state
    isDraftLoaded, // Pass flag for draft background styling
    isFinalDataFound, // Pass flag for final notification/read-only
    isFormDirty, // NEW: Pass form dirty status
    // NEW exports for modal control
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft, // Pass the function to call on confirmation
  };
}; 