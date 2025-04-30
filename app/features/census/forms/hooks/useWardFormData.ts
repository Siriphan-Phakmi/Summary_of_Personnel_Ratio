'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { WardForm, ShiftType, FormStatus, Ward } from '@/app/core/types/ward';
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
  selectedWard: string; // Document ID (keep for reference if needed)
  selectedBusinessWardId: string; // Business Ward ID (e.g., "Ward5")
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  reloadDataTrigger: number;
}

export const useWardFormData = ({
  selectedWard, // Keep receiving doc ID
  selectedBusinessWardId, // Receive business ID
  selectedDate,
  selectedShift,
  user,
  reloadDataTrigger,
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
  const [selectedWardObject, setSelectedWardObject] = useState<Ward | null>(null); // Store the selected ward object

  // Store previous selection to prevent unnecessary reloads if only shift changes
  const prevSelectionRef = useRef({ ward: selectedBusinessWardId, date: selectedDate });

  useEffect(() => {
    // Determine if the core selection (ward/date) or user has changed
    const selectionChanged = 
        prevSelectionRef.current.ward !== selectedBusinessWardId || // Check business ID change
        prevSelectionRef.current.date !== selectedDate;

    // Only reset form/errors/dirty status if ward/date selection changed, 
    // not just the shift or user object reference (if user data itself didn't change identity)
    if (selectionChanged) {
    setError(null);
        setErrors({});
        setIsFormDirty(false);
        
        // *** IMPORTANT CHANGE: Don't reset form data immediately ***
        // console.log('[useWardFormData] Selection changed (Ward/Date), resetting form data.');
        // setFormData({});
        
        // Update the ref for the next comparison
        prevSelectionRef.current = { ward: selectedBusinessWardId, date: selectedDate };
    }

    // --- Load data logic --- 
    const loadData = async () => {
        // *** CRITICAL CHECK: Use selectedBusinessWardId for the check ***
        if (!selectedBusinessWardId || !selectedDate || !user?.uid) {
            console.log('[useWardFormData] Skipping loadData: Missing selectedBusinessWardId, selectedDate, or user.uid');
            setIsLoading(false);
            return; 
        }
        
        console.log(`[useWardFormData] Starting loadData for BusinessWardID: ${selectedBusinessWardId}, Date: ${selectedDate}, Shift: ${selectedShift}`); // Log business ID
        setIsLoading(true);
        // Reset specific states related to loaded data properties before fetch
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

            // 1. Fetch Existing Form Data - *** Use selectedBusinessWardId ***
            let existingForm = null;
            try {
                console.log(`[useWardFormData] Calling getWardForm with: date=${dateTimestamp}, shift=${selectedShift}, wardId=${selectedBusinessWardId}`); // Pass business ID
                existingForm = await getWardForm(dateTimestamp, selectedShift, selectedBusinessWardId); // Use Business ID
                console.log('[useWardFormData] Result from getWardForm:', existingForm ? `Status: ${existingForm.status}, ID: ${existingForm.id}` : 'null');
                if (existingForm) {
                    console.log('[useWardFormData] DETAILED INSPECTION - existingForm:', JSON.stringify(existingForm, null, 2));
                }
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
                    showSafeToast(`ข้อมูลบันทึกสมบูรณ์/อนุมัติสำหรับกะนี้ ถูกโหลดแล้ว (อ่านอย่างเดียว)`, 'info', { id: `load-final-${selectedBusinessWardId}-${selectedDate}-${selectedShift}` });
                    
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
                    showSafeToast("กำลังแสดงข้อมูลฉบับร่างที่มีอยู่สำหรับกะนี้", 'warning', { id: `load-draft-${selectedBusinessWardId}-${selectedDate}-${selectedShift}` }); // Use warning color for draft
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

                 let initialData: Partial<WardForm> = { // Ensure type here
                    ...initialFormStructure,
                    recorderFirstName: user?.firstName || '',
                    recorderLastName: user?.lastName || '',
                 };

                 // Handle Morning Shift Census Calculation - *** Use selectedBusinessWardId ***
                 if (selectedShift === ShiftType.MORNING) {
                    let previousNightForm: WardForm | null = null;
                    try {
                        // Pass business ward id here too
                        previousNightForm = await getLatestPreviousNightForm(targetDate, selectedBusinessWardId);
                    } catch (prevNightError) {
                         console.error("Error fetching previous night form:", prevNightError);
                        showSafeToast('เกิดข้อผิดพลาดในการดึงข้อมูลกะกลางคืนก่อนหน้า', 'error', { id: `load-prev-night-error-${selectedBusinessWardId}-${selectedDate}` });
                    }

                    if (previousNightForm?.patientCensus !== undefined) {
                        // Check status of previous night form before setting census
                        if (previousNightForm.status === FormStatus.APPROVED || previousNightForm.status === FormStatus.FINAL) {
                            initialData.patientCensus = Number(previousNightForm.patientCensus);
                            setIsMorningCensusReadOnly(true);
                            setIsCensusAutoCalculated(true);
                            console.log('[useWardFormData] Setting morning census from previous FINAL/APPROVED night form.');
                            // Use specific ID for toast
                            showSafeToast(`Patient Census (${initialData.patientCensus}) ถูกดึงจากข้อมูลกะดึกก่อนหน้า (${previousNightForm.status}) และถูกล็อค`, 'info', { id: `load-prev-night-census-${selectedBusinessWardId}-${selectedDate}` });
                        } else {
                             // If previous night exists but is only DRAFT
                             setIsMorningCensusReadOnly(false);
                             setIsCensusAutoCalculated(false);
                             console.log('[useWardFormData] Previous night form found but is DRAFT. Morning census editable.');
                             // Use specific ID for toast
                             showSafeToast('พบข้อมูลกะดึกก่อนหน้า (สถานะร่าง) - Patient Census สามารถแก้ไขได้', 'warning', { id: `load-prev-night-draft-${selectedBusinessWardId}-${selectedDate}` });
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
                console.log('[useWardFormData] Preparing to set formData with INITIAL data (wardName missing):', JSON.stringify(initialData, null, 2));
                setFormData(initialData); // Set initial data (might lack wardName temporarily)
                setIsFormDirty(false);

                // *** IMPORTANT CHANGE: Only reset formData here if no existing data was found ***
                // This now happens after we attempted to load data
                if (selectionChanged) {
                    console.log('[useWardFormData] Selection changed and no existing data found, resetting form data.');
                    setFormData(initialData);
                    setIsFormDirty(false);
                }
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

  }, [selectedBusinessWardId, selectedDate, selectedShift, user, reloadDataTrigger]);

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

  // Function to actually perform the draft save (called directly or by modal)
  const proceedToSaveDraft = async () => {
      if (!user || !selectedBusinessWardId) return; // Guard clause

    setIsSaving(true);
      setShowConfirmOverwriteModal(false); // Close modal if it was open

      try {
          const dataToSave = await prepareDataForSave(false); // Use Business ID here
          if (!dataToSave) {
               showErrorToast("ไม่สามารถเตรียมข้อมูลสำหรับบันทึกร่างได้");
               setIsSaving(false);
               return;
          }
          
          // *** IMPORTANT: Log the data being saved, specifically the ID ***
          console.log("[useWardFormData] Saving draft data with ID:", dataToSave.id);
          console.log("[useWardFormData] Draft data details:", JSON.stringify({
            id: dataToSave.id,
            wardId: dataToSave.wardId,
            date: dataToSave.date,
            shift: dataToSave.shift,
            status: dataToSave.status,
            isDraft: dataToSave.isDraft,
          }, null, 2));
          
          const savedDocId = await saveDraftWardForm(dataToSave, user);
          showSafeToast(`บันทึกร่างสำเร็จ (ID: ${savedDocId})`, 'success');
          
          // *** IMPORTANT: Ensure we update the form data with the correct ID ***
          setFormData(prev => ({
            ...prev,
            id: savedDocId,
            status: FormStatus.DRAFT,
            isDraft: true,
            wardId: selectedBusinessWardId,
            wardName: dataToSave.wardName || ''
          }));
          
          setIsFormDirty(false); // Reset dirty state after successful save
          setIsDraftLoaded(true); // Indicate that the current state is now a saved draft

    } catch (error) {
          console.error("[useWardFormData] Error saving draft:", error);
          showErrorToast(`เกิดข้อผิดพลาดในการบันทึกร่าง: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Prepare data for saving, ensuring necessary fields are present
  const prepareDataForSave = async (finalSave: boolean = false): Promise<Partial<WardForm> | null> => {
      // Fetch ward details if needed to get wardName (if not already in formData)
      let wardName = formData.wardName;
      if (!wardName && selectedBusinessWardId) {
         try {
             // Assuming a function getWardDetailsById exists or similar
             // This is inefficient, ideally wardName comes from DailyCensusForm prop
             // Let's adjust to expect wardName in formData or fetch it once
             console.warn("Ward name missing in formData, attempting fetch - consider passing Ward object or name as prop");
             // Simplified: For now, let's rely on it being potentially set during load or assume it's optional for save
         } catch (fetchError) {
             console.error("Could not fetch ward details for name", fetchError);
             // Proceed without wardName if fetch fails? Or show error?
         }
      }

      // *** IMPORTANT: Ensure ID is preserved if it exists ***
      // Log current formData.id for debugging
      console.log("[prepareDataForSave] Current formData.id:", formData.id);

      const data : Partial<WardForm> = {
          ...formData,
          id: formData.id, // Include existing document ID if present (for updates)
          wardId: selectedBusinessWardId, // *** Use Business Ward ID ***
          wardName: formData.wardName || selectedBusinessWardId, // Use existing or fallback to ID
          date: Timestamp.fromDate(new Date(selectedDate + 'T00:00:00')), // Convert date string to Timestamp
          shift: selectedShift,
          status: finalSave ? FormStatus.FINAL : FormStatus.DRAFT,
          isDraft: !finalSave,
          // recorderFirstName/LastName should be in formData already
          // createdBy/updatedAt handled by service
      };
      
      // Log the prepared data for debugging
      console.log("[prepareDataForSave] Prepared data with ID:", data.id);
      
      // Remove undefined fields that might cause issues with Firestore merge
      Object.keys(data).forEach(key => {
          if (data[key as keyof WardForm] === undefined) {
              delete data[key as keyof WardForm];
          }
      });
      return data;
  };

  // Update handleSaveDraft to handle potential overwrite
  const handleSaveDraft = async () => {
      if (!user || !selectedBusinessWardId) {
        showErrorToast(user ? "กรุณาเลือกหอผู้ป่วยก่อนบันทึก" : "ไม่พบข้อมูลผู้ใช้");
      return;
    }
       if (!selectedDate || !selectedShift) {
           showErrorToast("กรุณาเลือกวันที่และกะ");
      return;
    }
       if (isSaving) return;

      // Overwrite check logic
      try {
           // Check if the form is dirty AND if there's existing FINAL/APPROVED data
           if (isFormDirty) {
                const finalCheckDate = Timestamp.fromDate(new Date(selectedDate + 'T00:00:00'));
                // Use business ID for the check
                const existingFinal = await getWardForm(finalCheckDate, selectedShift, selectedBusinessWardId);

                if (existingFinal && (existingFinal.status === FormStatus.FINAL || existingFinal.status === FormStatus.APPROVED)) {
                     console.log("[handleSaveDraft] Final/Approved data exists and form is dirty. Showing overwrite modal.");
                     setShowConfirmOverwriteModal(true); // Show modal
                     return; // Wait for modal confirmation
                }
           }
      } catch (checkError) {
          console.error("[handleSaveDraft] Error checking for existing final form:", checkError);
          // Decide how to proceed - maybe allow save but show warning? For now, proceed to save.
      }

      // If no need for modal, save directly
       await proceedToSaveDraft(); 
  };

  // Update handleSaveFinal
  const handleSaveFinal = async () => {
      if (!user || !selectedBusinessWardId) {
        showErrorToast(user ? "กรุณาเลือกหอผู้ป่วยก่อนบันทึก" : "ไม่พบข้อมูลผู้ใช้");
      return;
    }
      if (isSaving) return;

      // Validate form for final save
    if (!validateForm(true)) {
          showErrorToast("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้องก่อนบันทึกสมบูรณ์");
          // Find first error field and focus it (optional enhancement)
          const firstErrorField = Object.keys(errors)[0];
          if (firstErrorField) {
              const element = document.getElementById(firstErrorField);
              element?.focus();
          }
      return;
    }
    
    setIsSaving(true);
    try {
          const dataToSave = await prepareDataForSave(true); // Use Business ID here
           if (!dataToSave) {
               showErrorToast("ไม่สามารถเตรียมข้อมูลสำหรับบันทึกสมบูรณ์ได้");
               setIsSaving(false);
               return;
          }
          let savedDocId = '';

          console.log(`[useWardFormData] Finalizing ${selectedShift} shift data:`, dataToSave);

          if (selectedShift === ShiftType.MORNING) {
              savedDocId = await finalizeMorningShiftForm(dataToSave, user);
          } else { // Night shift
              savedDocId = await finalizeNightShiftForm(dataToSave, user);
          }

          showSafeToast(`บันทึกข้อมูลสมบูรณ์สำเร็จ (ID: ${savedDocId})`, 'success');
          setFormData(prev => ({ ...prev, id: savedDocId, status: FormStatus.FINAL, isDraft: false, wardId: selectedBusinessWardId, wardName: dataToSave.wardName })); // Update form state
          setIsFormDirty(false); // Reset dirty state
          setIsFormReadOnly(true); // Make form read-only after final save
          setIsDraftLoaded(false);

          // TODO: Trigger reload or update shift status display
      } catch (error) {
          console.error("[useWardFormData] Error saving final:", error);
          showErrorToast(`เกิดข้อผิดพลาดในการบันทึกสมบูรณ์: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      isFormReadOnly,
    isCensusAutoCalculated,
      error,
      isDraftLoaded,
      isFinalDataFound,
      isFormDirty,
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
      proceedToSaveDraft, // Expose this for the modal
      handleChange,
      validateForm,
      handleSaveDraft,
      handleSaveFinal,
  };
}; 