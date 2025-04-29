'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { 
  getWardForm, 
  getLatestPreviousNightForm, 
  getLatestDraftForm,
  saveDraftWardForm,
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
  reloadDataTrigger: number; // Trigger for re-fetching data
}

export const useWardFormData = ({
  selectedWard,
  selectedDate,
  selectedShift,
  user,
  reloadDataTrigger, // Kept as prop
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
        console.log('[useWardFormData] Selection changed, resetting form data.');
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
        
        console.log(`[useWardFormData] Starting loadData for Ward: ${selectedWard}, Date: ${selectedDate}, Shift: ${selectedShift}`);
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
            let existingForm = null;
            try {
                console.log(`[useWardFormData] Calling getWardForm with: date=${dateTimestamp}, shift=${selectedShift}, wardId=${selectedWard}`);
                existingForm = await getWardForm(dateTimestamp, selectedShift, selectedWard);
                console.log('[useWardFormData] Result from getWardForm:', existingForm ? `Status: ${existingForm.status}, ID: ${existingForm.id}` : 'null');
                if (existingForm) {
                    console.log('[useWardFormData] DETAILED INSPECTION - existingForm:', JSON.stringify(existingForm, null, 2));
                    // console.log('[useWardFormData] Fields with values:', Object.entries(existingForm)
                    //     .filter(([k, v]) => v !== null && v !== undefined && k !== 'date' && k !== 'createdAt' && k !== 'updatedAt')
                    //     .map(([k, v]) => `${k}: ${v}`));
                }
            // console.log('[useWardFormData] Checked for existing form:', existingForm?.status);
            } catch (error) {
                console.error('[useWardFormData] Error calling getWardForm:', error);
                showErrorToast(`เกิดข้อผิดพลาดในการโหลดแบบฟอร์ม: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`);
            }

            if (existingForm) {
                const isFinal = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
                const isDraft = existingForm.status === FormStatus.DRAFT;

                console.log(`[useWardFormData] Processing existing form with status: ${existingForm.status}, isFinal: ${isFinal}, isDraft: ${isDraft}`);

                // Prepare base loaded data structure
                loadedData = {
                    ...existingForm,
                    // Convert Timestamp back to 'yyyy-MM-dd' string for the date input field
                    date: existingForm.date instanceof Timestamp ? format(existingForm.date.toDate(), 'yyyy-MM-dd') : typeof existingForm.date === 'string' ? existingForm.date : selectedDate,
                    // Ensure numbers are numbers, null, or undefined (don't convert null to 0)
                    patientCensus: existingForm.patientCensus ?? undefined,
                    nurseManager: existingForm.nurseManager ?? undefined,
                    rn: existingForm.rn ?? undefined,
                    pn: existingForm.pn ?? undefined,
                    wc: existingForm.wc ?? undefined,
                    newAdmit: existingForm.newAdmit ?? undefined,
                    transferIn: existingForm.transferIn ?? undefined,
                    referIn: existingForm.referIn ?? undefined,
                    transferOut: existingForm.transferOut ?? undefined,
                    referOut: existingForm.referOut ?? undefined,
                    discharge: existingForm.discharge ?? undefined,
                    dead: existingForm.dead ?? undefined,
                    available: existingForm.available ?? undefined,
                    unavailable: existingForm.unavailable ?? undefined,
                    plannedDischarge: existingForm.plannedDischarge ?? undefined,
                };
                
                // console.log('[useWardFormData] DETAILED INSPECTION - loadedData before recorder names:', 
                //     Object.entries(loadedData)
                //         .filter(([k, v]) => v !== null && v !== undefined && k !== 'date' && k !== 'createdAt' && k !== 'updatedAt' && typeof v !== 'object')
                //         .map(([k, v]) => `${k}: ${v}`));

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
                    console.log('[useWardFormData] FINAL data found. Setting read-only state.');
                    setIsFinalDataFound(true);
                    setIsFormReadOnly(true); // Read-only if Final/Approved
                    console.log('[useWardFormData] Setting isFormReadOnly = true'); // Explicit log
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
                         console.log('[useWardFormData] Setting isMorningCensusReadOnly = true, isCensusAutoCalculated = true for FINAL morning shift.');
                     }

                } else if (isDraft) {
                    console.log('[useWardFormData] DRAFT data found and loaded.');
                    setIsFinalDataFound(false);
                    setIsFormReadOnly(false); // Editable if Draft
                    console.log('[useWardFormData] Setting isFormReadOnly = false (Draft)'); // Explicit log
                    setIsDraftLoaded(true); // Set flag indicating current data is a loaded draft
                    // Use specific ID for toast
                    showSafeToast("กำลังแสดงข้อมูลฉบับร่างที่มีอยู่สำหรับกะนี้", 'warning', { id: `load-draft-${selectedWard}-${selectedDate}-${selectedShift}` }); // Use warning color for draft
                     if (selectedShift === ShiftType.MORNING) {
                        // If draft for morning, it's editable, census not forced read-only from previous night
                        setIsMorningCensusReadOnly(false);
                        setIsCensusAutoCalculated(false); // Don't auto-calculate display if loading draft
                        console.log('[useWardFormData] Setting isMorningCensusReadOnly = false, isCensusAutoCalculated = false for DRAFT morning shift.');
                    }
                }
                // Log data before setting state
                console.log('[useWardFormData] Preparing to set formData with LOADED data (existing form found):', JSON.stringify(loadedData, null, 2));
                setFormData(loadedData);
                setIsFormDirty(false); // Data just loaded is not dirty

            } else {
                 console.log('[useWardFormData] No existing form found for this shift. Initializing form.');
                 // No existing data for the current shift, proceed to check previous night for Morning shift
                 setIsFinalDataFound(false);
                 setIsFormReadOnly(false); // Not read-only if creating new
                 console.log('[useWardFormData] Setting isFormReadOnly = false (No existing form)'); // Explicit log
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
                        // Check status of previous night form before setting census
                        if (previousNightForm.status === FormStatus.APPROVED || previousNightForm.status === FormStatus.FINAL) {
                            initialData.patientCensus = Number(previousNightForm.patientCensus);
                            setIsMorningCensusReadOnly(true);
                            setIsCensusAutoCalculated(true);
                            console.log('[useWardFormData] Setting morning census from previous FINAL/APPROVED night form.');
                            // Use specific ID for toast
                            showSafeToast(`Patient Census (${initialData.patientCensus}) ถูกดึงจากข้อมูลกะดึกก่อนหน้า (${previousNightForm.status}) และถูกล็อค`, 'info', { id: `load-prev-night-census-${selectedWard}-${selectedDate}` });
                        } else {
                             // If previous night exists but is only DRAFT
                             setIsMorningCensusReadOnly(false);
                             setIsCensusAutoCalculated(false);
                             console.log('[useWardFormData] Previous night form found but is DRAFT. Morning census editable.');
                             // Use specific ID for toast
                             showSafeToast('พบข้อมูลกะดึกก่อนหน้า (สถานะร่าง) - Patient Census สามารถแก้ไขได้', 'warning', { id: `load-prev-night-draft-${selectedWard}-${selectedDate}` });
                        }
                    } else {
                         // No previous night form found at all
                         setIsMorningCensusReadOnly(false);
                         setIsCensusAutoCalculated(false);
                         console.log('[useWardFormData] No previous night form found. Morning census editable.');
                    }
                 } else { // Night shift and no existing form found
                     setIsCensusAutoCalculated(false);
                     console.log('[useWardFormData] Initializing empty night shift form.');
                 }

                // Log data before setting state
                console.log('[useWardFormData] Preparing to set formData with INITIAL data (no existing form found):', JSON.stringify(initialData, null, 2));
                setFormData(initialData);
                setIsFormDirty(false);
            }
        } catch (err) {
           console.error("[useWardFormData] Error during loadData processing:", err);
           // Reset form state on error to prevent inconsistent data
           setFormData({});
           setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
           // Optionally reset other states too
           setErrors({});
           setIsFormReadOnly(false);
           setIsMorningCensusReadOnly(false);
           setIsCensusAutoCalculated(false);
           setIsDraftLoaded(false);
           setIsFinalDataFound(false);
        } finally {
           setIsLoading(false);
           console.log('[useWardFormData] loadData finished.');
        }
    };

    // Trigger loadData if user exists
    if (user) {
      console.log('[useWardFormData] User exists, triggering loadData.');
      loadData();
    } else {
      // Handle case where user logs out while viewing the form
      console.log('[useWardFormData] User does not exist, resetting form.');
      setFormData({}); // Reset form if user becomes null
      setIsLoading(false);
      setError(null);
      setErrors({});
      // Reset other relevant states
      setIsFormReadOnly(false);
      setIsMorningCensusReadOnly(false);
      setIsCensusAutoCalculated(false);
      setIsDraftLoaded(false);
      setIsFinalDataFound(false);
    }

  }, [selectedWard, selectedDate, selectedShift, user, reloadDataTrigger]);

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
    setShowConfirmOverwriteModal(false); // Hide modal first

    console.log('[useWardFormData] Proceeding to save draft...');
    setIsSaving(true);
    setError(null);

    // <<< Explicitly merge current selections into data for saving >>>
    const dataToSave = {
      ...formData, // Start with existing form data
      wardId: selectedWard, // Ensure current wardId is used
      shift: selectedShift, // Ensure current shift is used
      date: selectedDate,   // Ensure current date is used (service will convert to Timestamp)
    };

    // <<< Add Log to inspect dataToSave >>>
    console.log('[proceedToSaveDraft] dataToSave before calling saveDraftWardForm:', JSON.stringify(dataToSave, null, 2));
    
    try {
      // Use the centralized function
      if (!user) { // <<< Add null check for user
        throw new Error('User data is not available.');
      }
      // <<< Pass dataToSave instead of formData >>>
      const draftDocId = await saveDraftWardForm(dataToSave, user); 

      if (draftDocId) {
        // <<< Update formData state with the saved data, including the ID >>>
        setFormData(prev => ({ ...dataToSave, id: draftDocId, isDraft: true, status: FormStatus.DRAFT })); 
        showSafeToast('บันทึกร่างสำเร็จ', 'success', { id: `save-draft-success-${selectedWard}-${selectedDate}-${selectedShift}` });
        setIsDraftLoaded(true); // Mark that we are now working with a saved draft
        setIsFormDirty(false); // Reset dirty status after successful save
      } else {
        throw new Error('ไม่ได้รับ Document ID หลังจากการบันทึกร่าง');
      }
    } catch (error) {
      console.error('[useWardFormData] Error saving draft:', error);
      showErrorToast(`เกิดข้อผิดพลาดในการบันทึกร่าง: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`, { id: `save-draft-error-${selectedWard}-${selectedDate}-${selectedShift}` });
      setError('Failed to save draft.');
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
      // const cleanFormData = Object.fromEntries(
      //   Object.entries(formData).map(([key, value]) => [key, value === undefined ? null : value])
      // );
      
      // <<< Explicitly merge current selections and clean undefined values >>>
      const baseData = {
        ...formData, // Start with current form data
        wardId: selectedWard, // Ensure current wardId is used
        shift: selectedShift, // Ensure current shift is used
        date: selectedDate,   // Ensure current date is used (service will convert to Timestamp)
        // Ensure recorder names are included (might be from formData or user)
        recorderFirstName: formData.recorderFirstName || user?.firstName || '',
        recorderLastName: formData.recorderLastName || user?.lastName || '',
        // Find WardName if not present in formData (optional, service might handle this too)
        wardName: formData.wardName || '', // Pass empty if not found, service can look up
      };
      
      // Clean undefined values from the merged data
      const dataToFinalize = Object.fromEntries(
        Object.entries(baseData).map(([key, value]) => [key, value === undefined ? null : value])
      );

      // <<< Add Log to inspect dataToFinalize >>>
      console.log('[handleSaveFinal] dataToFinalize before calling service:', JSON.stringify(dataToFinalize, null, 2));

      // ข้อมูลเพิ่มเติมสำหรับ Service Function
      const finalDataPayload: Partial<WardForm> = {
        ...(dataToFinalize as Partial<WardForm>), // Use the cleaned and merged data
        status: FormStatus.FINAL, // Set status to FINAL
        isDraft: false,          // Set isDraft to false
        createdBy: user?.uid || '', // Add user info
        updatedAt: Timestamp.now(), // Add timestamp
        finalizedAt: Timestamp.now(), // Add finalized timestamp
        // date, shift, wardId, wardName, recorder names are already in dataToFinalize
      };

      let docId = '';
      // เลือกใช้ฟังก์ชันตาม shift
      if (selectedShift === ShiftType.MORNING && user) {
        docId = await finalizeMorningShiftForm(finalDataPayload, user);
      } else if (selectedShift === ShiftType.NIGHT && user) {
        docId = await finalizeNightShiftForm(finalDataPayload, user);
      } else {
        throw new Error('ข้อมูล Shift หรือ User ไม่ถูกต้อง');
      }
      
      // แสดง notification เมื่อบันทึกสำเร็จ
      showSafeToast('บันทึกข้อมูลสมบูรณ์ (Final) สำเร็จ!', 'success');
      
      // --- Update States AFTER successful save ---
      // <<< Update formData with the saved final data >>>
      setFormData(prev => ({ ...finalDataPayload, id: docId })); 
      setIsFormReadOnly(true); 
      setIsFormDirty(false); 
      setIsFinalDataFound(true); // <<< SET isFinalDataFound to true
      // setReloadDataTrigger(prev => prev + 1); // <<< TEMPORARILY COMMENT OUT to test UI update
      // --- End State Updates ---

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