'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef, Dispatch, SetStateAction } from 'react';
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
import { showInfoToast, showErrorToast, showSafeToast, dismissAllToasts } from '@/app/core/utils/toastUtils';
import { logUserActivity } from '@/app/core/utils/logUtils';
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

// Return type definition for the hook
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
  showConfirmOverwriteModal: boolean;
  setShowConfirmOverwriteModal: Dispatch<SetStateAction<boolean>>;
  proceedToSaveDraft: () => Promise<void>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  validateForm: (finalSave?: boolean) => boolean;
  handleSaveDraft: () => Promise<void>;
  handleSaveFinal: () => Promise<void>;
  setIsFormReadOnly: Dispatch<SetStateAction<boolean>>; // Ensure correct type
}

export const useWardFormData = ({
  selectedWard, // Keep receiving doc ID
  selectedBusinessWardId, // Receive business ID
  selectedDate,
  selectedShift,
  user,
  reloadDataTrigger,
}: UseWardFormDataProps): UseWardFormDataReturn => {
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

    // --- Load data logic --- 
  const loadData = useCallback(async () => {
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
                const isRejected = existingForm.status === FormStatus.REJECTED;

                console.log(`[useWardFormData] Processing existing form with status: ${existingForm.status}, isFinal: ${isFinal}, isDraft: ${isDraft}, isRejected: ${isRejected}`);
                console.log(`[useWardFormData] Form rejection info:`, {
                  status: existingForm.status,
                  rejectionReason: existingForm.rejectionReason,
                  existingFormId: existingForm.id
                });

                // If form is rejected, ensure shift remains consistent
                if (isRejected) {
                    console.log('[useWardFormData] Rejected form detected, setting selectedShift to match existing form shift');
                    // Ideally, we would inform parent to set the shift, but ensure local behavior
                    // No direct setter here, but parent effect should handle shift consistency
                }

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
                console.log('[useWardFormData] FINAL/APPROVED data found. Setting read-only state.');
                    setIsFinalDataFound(true);
                setIsFormReadOnly(true); // Read-only regardless
                console.log('[useWardFormData] Setting isFormReadOnly = true, status = ', existingForm.status, 'form ID =', existingForm.id);
                    setIsDraftLoaded(false);
                // Show toast only on initial load
                if (reloadDataTrigger === 0) {
                  if (existingForm.status === FormStatus.APPROVED) {
                    showSafeToast(
                      'ข้อมูลบันทึกสมบูรณ์และได้รับการอนุมัติแล้ว',
                      'success',
                      { id: `load-approved-${selectedBusinessWardId}-${selectedDate}-${selectedShift}` }
                    );
                    logUserActivity(
                      user?.uid || '',
                      user?.username || user?.displayName || '',
                      'load_approved',
                      { wardId: selectedBusinessWardId, date: selectedDate, shift: selectedShift }
                    );
                  } else {
                    showSafeToast(
                      'บันทึกข้อมูลสมบูรณ์เสร็จสิ้น รอ Supervisor อนุมัติ',
                      'info',
                      { id: `load-pending-${selectedBusinessWardId}-${selectedDate}-${selectedShift}` }
                    );
                    logUserActivity(
                      user?.uid || '',
                      user?.username || user?.displayName || '',
                      'load_pending',
                      { wardId: selectedBusinessWardId, date: selectedDate, shift: selectedShift }
                    );
                     }
                }
                } else if (isRejected) {
                    // Handle rejected form: unlock for corrections - เพิ่ม debug log ให้ชัดเจนขึ้น
                    console.log('[useWardFormData] ★★★ REJECTED data found. Unlocking form for user to correct.');
                    console.log('[useWardFormData] ★★★ Rejection reason:', existingForm.rejectionReason);
                    console.log('[useWardFormData] ★★★ Setting isFormReadOnly = false, isDraftLoaded = true');
                    setIsFormReadOnly(false);
                    setIsFinalDataFound(false);
                    setIsDraftLoaded(true);
                    // Notify user of rejection reason
                    showSafeToast(
                      `แบบฟอร์มถูกปฏิเสธ: ${existingForm.rejectionReason || 'ไม่มีเหตุผลแจ้ง'} (กรุณาแก้ไขและบันทึกใหม่)`,
                      'warning',
                      { id: `load-rejected-${selectedBusinessWardId}-${selectedDate}-${selectedShift}` }
                    );
                    // บันทึก log การโหลดข้อมูลที่ถูกปฏิเสธ
                    logUserActivity(
                      user?.uid || '',
                      user?.username || user?.displayName || '',
                      'load_rejected_form',
                      { 
                        wardId: selectedBusinessWardId, 
                        date: selectedDate, 
                        shift: selectedShift,
                        rejectionReason: existingForm.rejectionReason || 'no reason provided'
                      }
                    );
                } else if (isDraft) {
                    console.log('[useWardFormData] DRAFT data found and loaded.');
                    setIsFinalDataFound(false);
                    setIsFormReadOnly(false); // Editable if Draft
                console.log('[useWardFormData] Setting isFormReadOnly = false (Draft), status = ', existingForm.status, 'form ID =', existingForm.id);
                    setIsDraftLoaded(true); // Set flag indicating current data is a loaded draft
                // Show draft-loading toast only on initial load, not after Save Draft reload
                if (reloadDataTrigger === 0) {
                  dismissAllToasts();
                  showSafeToast(
                    'กำลังแสดงข้อมูลฉบับร่างที่มีอยู่สำหรับกะนี้',
                    'warning',
                    { id: `load-draft-${selectedBusinessWardId}-${selectedDate}-${selectedShift}` }
                  );
                  logUserActivity(
                    user?.uid || '',
                    user?.username || user?.displayName || '',
                    'load_draft',
                    { wardId: selectedBusinessWardId, date: selectedDate, shift: selectedShift }
                  );
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
                     // Notify user that there is no previous night data
                     if (reloadDataTrigger === 0) {
                       showSafeToast('ไม่พบข้อมูลกะดึกก่อนหน้า กรุณาบันทึกข้อมูลใหม่', 'info', { id: `load-no-prev-night-${selectedBusinessWardId}-${selectedDate}` });
                       logUserActivity(
                         user?.uid || '',
                         user?.username || user?.displayName || '',
                         'NoPreviousNight',
                         { wardId: selectedBusinessWardId, date: selectedDate }
                       );
                     }
                    }
                 } else { // Night shift and no existing form found
                     // Attempt to fetch previous morning shift's final/approved census for night shift
                     try {
                         console.log('[useWardFormData] Fetching previous MORNING form for night shift census');
                         const morningForm = await getWardForm(dateTimestamp, ShiftType.MORNING, selectedBusinessWardId);
                         if (
                             morningForm &&
                             (morningForm.status === FormStatus.FINAL || morningForm.status === FormStatus.APPROVED) &&
                             morningForm.patientCensus !== undefined
                         ) {
                             // Prefill night census from morning shift
                             initialData.patientCensus = Number(morningForm.patientCensus);
                             setIsCensusAutoCalculated(true);
                             console.log('[useWardFormData] Setting night census from MORNING FINAL/APPROVED form:', initialData.patientCensus);
                             showSafeToast(
                                 `Patient Census (${initialData.patientCensus}) ถูกดึงจากข้อมูลกะเช้า (${morningForm.status})`,
                                 'info',
                                 { id: `load-prev-morning-census-${selectedBusinessWardId}-${selectedDate}` }
                             );
                         } else {
                             setIsCensusAutoCalculated(false);
                             console.log('[useWardFormData] No FINAL/APPROVED morning form found. Night census editable.');
                         }
                     } catch (error) {
                         console.error('[useWardFormData] Error fetching morning form for night shift:', error);
                         setIsCensusAutoCalculated(false);
                     }
                 }

                // Log data before setting state
                console.log('[useWardFormData] Preparing to set formData with INITIAL data (wardName missing):', JSON.stringify(initialData, null, 2));
                setFormData(initialData); // Set initial data (might lack wardName temporarily)
                setIsFormDirty(false);

                // *** IMPORTANT CHANGE: Only reset formData here if no existing data was found ***
                // This now happens after we attempted to load data
            // if (selectionChanged) {
            //     console.log('[useWardFormData] Selection changed and no existing data found, resetting form data.');
            //     setFormData(initialData);
            //     setIsFormDirty(false);
            // }
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
}, [selectedBusinessWardId, selectedDate, selectedShift, user, reloadDataTrigger, setFormData, setIsLoading, setErrors, setError, setIsFormReadOnly, setIsMorningCensusReadOnly, setIsCensusAutoCalculated, setIsDraftLoaded, setIsFinalDataFound]); // Add all dependencies

  // Effect to load data based on dependencies
  useEffect(() => {
    if (user && selectedBusinessWardId) {
      console.log(`[useWardFormData] Dependencies changed, triggering loadData. reloadTrigger=${reloadDataTrigger}, shift=${selectedShift}, date=${selectedDate}, wardId=${selectedBusinessWardId}`);
      
      // <<< เคลียร์ข้อมูลเก่าและตั้ง loading ก่อนโหลด >>>
      setFormData({}); // เคลียร์ข้อมูลฟอร์มเก่า
      setErrors({});   // เคลียร์ errors เก่า
      setError(null);  // เคลียร์ error ทั่วไป
      setIsLoading(true); // ตั้งสถานะกำลังโหลด
      setIsDraftLoaded(false); // รีเซ็ตสถานะ draft
      setIsFinalDataFound(false); // รีเซ็ตสถานะ final data
      
      loadData(); // เรียกฟังก์ชันโหลดข้อมูล
    } else {
      // Handle case where user logs out or ward is not selected
      if (!user) console.log('[useWardFormData] User does not exist, resetting form.');
      if (!selectedBusinessWardId) console.log('[useWardFormData] No Business Ward ID selected, resetting form.');
      
      setFormData({}); // Reset form
      setIsLoading(false);
      setError(null);
      setErrors({});
      setIsFormReadOnly(false);
      setIsMorningCensusReadOnly(false);
      setIsCensusAutoCalculated(false);
      setIsDraftLoaded(false);
      setIsFinalDataFound(false);
    }
  }, [selectedBusinessWardId, selectedDate, user, loadData]); // Use loadData callback as dependency, removed shift and reloadDataTrigger as they trigger loadData via useCallback

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
      console.log("[prepareDataForSave] Form data before prepare:", JSON.stringify(formData, null, 2));

      // สร้างสำเนาข้อมูลปัจจุบันก่อน
      const currentFormData = { ...formData };

      // ตรวจสอบทุกฟิลด์ตัวเลขว่ามีค่าหรือไม่ ถ้าไม่มีให้เก็บเป็น undefined แทนที่จะเป็น 0
      const numericFields: (keyof WardForm)[] = [
        'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
        'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut',
        'discharge', 'dead', 'available', 'unavailable', 'plannedDischarge'
      ];

      // สร้างอ็อบเจ็กต์ข้อมูลที่จะบันทึก
      const data : Partial<WardForm> = {
          ...currentFormData,
          id: currentFormData.id,
          wardId: selectedBusinessWardId,
          wardName: currentFormData.wardName || selectedBusinessWardId,
          date: Timestamp.fromDate(new Date(selectedDate + 'T00:00:00')),
          shift: selectedShift,
          status: finalSave ? FormStatus.FINAL : FormStatus.DRAFT,
          isDraft: !finalSave,
          dateString: selectedDate,
      };
      
      // ตรวจสอบฟิลด์ตัวเลขแต่ละตัว และกำหนดค่าให้ถูกต้องตาม type
      numericFields.forEach(field => {
          const value = currentFormData[field];
          const numValue = (value === null || value === undefined || value === '') ? undefined : Number(value);
          console.log(`[prepareDataForSave] Processing field: ${field}, originalValue: ${value}, numericValue: ${numValue}`); // <<< เพิ่ม Log
          // แก้ไข type error โดย cast data เป็น any
          (data as any)[field] = numValue;
      });
      
      // Log the prepared data for debugging
      console.log("[prepareDataForSave] Prepared data with ID:", data.id);
      console.log("[prepareDataForSave] FINAL data to save:", JSON.stringify(data, null, 2));
      
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

      // <<< เพิ่ม Log ข้อมูล formData ก่อนเริ่ม Final Save >>>
      console.log('[useWardFormData] handleSaveFinal - Initial formData:', formData);

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
    
    // สร้างสำเนาข้อมูลปัจจุบันไว้เพื่อใช้ในการอัพเดท state หลังจากบันทึกสำเร็จ
    const currentFormData = { ...formData };
    console.log(`[handleSaveFinal] Form data before save:`, currentFormData);
    
    setIsSaving(true);
    try {
          const dataToSave = await prepareDataForSave(true); // Use Business ID here
           if (!dataToSave) {
               showErrorToast("ไม่สามารถเตรียมข้อมูลสำหรับบันทึกสมบูรณ์ได้");
               setIsSaving(false);
               return;
          }
          
          // เพิ่ม log เพื่อตรวจสอบข้อมูลที่จะบันทึก
          console.log(`[handleSaveFinal] Data prepared for saving:`, JSON.stringify(dataToSave, null, 2));
          
          let savedDocId = '';

          console.log(`[useWardFormData] Finalizing ${selectedShift} shift data:`, dataToSave);

          if (selectedShift === ShiftType.MORNING) {
              savedDocId = await finalizeMorningShiftForm(dataToSave, user);
          } else { // Night shift
              savedDocId = await finalizeNightShiftForm(dataToSave, user);
          }

          console.log(`[handleSaveFinal] Save completed, document ID: ${savedDocId}`);
          showSafeToast(`บันทึกข้อมูลสมบูรณ์สำเร็จ (ID: ${savedDocId})`, 'success');

          // *** ปรับปรุงการอัพเดท state หลังจากบันทึกสำเร็จ ***
          const finalStateData: Partial<WardForm> = {
            ...currentFormData, // ใช้ข้อมูลที่มีอยู่ในปัจจุบันเป็นฐาน ไม่ใช่ dataToSave ที่อาจมีการแปลงข้อมูล
            id: savedDocId, // ใช้ ID ใหม่จากการบันทึก Final
            status: FormStatus.FINAL,
            isDraft: false,
            // ส่วนนี้คงไว้เพื่อความแน่ใจว่าวันที่ถูกต้องตาม type
            date: typeof currentFormData.date === 'string' ? currentFormData.date : selectedDate,
          };
          
          // เพิ่ม log เพื่อตรวจสอบข้อมูลหลังการบันทึก
          console.log(`[handleSaveFinal] Updated state with final data:`, JSON.stringify(finalStateData, null, 2));
          
          setFormData(finalStateData);
          setIsFormDirty(false); // Reset dirty state
          setIsFormReadOnly(true); // Make form read-only after final save
          console.log('[useWardFormData] After final save: Setting isFormReadOnly = true, formData.status =', FormStatus.FINAL, 'form ID =', savedDocId);
          setIsDraftLoaded(false);
          setIsFinalDataFound(true); // เพิ่มการตั้งค่า isFinalDataFound เป็น true

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
    setIsFormReadOnly, // เพิ่ม expose setIsFormReadOnly เพื่อใช้ใน DailyCensusForm
  };
}; 