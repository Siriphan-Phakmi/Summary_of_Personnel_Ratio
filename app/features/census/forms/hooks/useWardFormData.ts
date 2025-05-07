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
import { WardFieldLabels } from './wardFieldLabels'; // Assuming this mapping exists or will be created

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
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  validateForm: (finalSave?: boolean) => boolean;
  handleSaveDraft: () => Promise<void>;
  handleSaveFinal: () => Promise<void>;
  setIsFormReadOnly: Dispatch<SetStateAction<boolean>>;
  // --- Zero Confirmation ---
  showConfirmZeroModal: boolean;
  setShowConfirmZeroModal: Dispatch<SetStateAction<boolean>>;
  fieldsWithValueZero: string[];
  proceedWithSaveAfterZeroConfirmation: () => Promise<void>;
  // --- Overwrite Confirmation ---
  showConfirmOverwriteModal: boolean;
  setShowConfirmOverwriteModal: Dispatch<SetStateAction<boolean>>;
  proceedToSaveDraft: () => Promise<void>;
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
  const [initialNightCensusFromMorning, setInitialNightCensusFromMorning] = useState<number | null>(null);

  // --- NEW State for Zero Confirmation ---
  const [showConfirmZeroModal, setShowConfirmZeroModal] = useState(false);
  const [fieldsWithValueZero, setFieldsWithValueZero] = useState<string[]>([]);
  const [saveActionType, setSaveActionType] = useState<'draft' | 'final' | null>(null); // To know what to do after confirmation

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
        setInitialNightCensusFromMorning(null); // Reset every time data loads

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
                             setInitialNightCensusFromMorning(Number(morningForm.patientCensus));
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
    let processedValue: string | number | undefined | null = value;

    if (type === 'number') {
      if (value === '') {
        processedValue = undefined;
      } else {
        const numValue = parseFloat(value);
        processedValue = isNaN(numValue) ? undefined : numValue;
      }
    }

    // If user directly edits patientCensus for NIGHT shift, clear the auto-filled morning census marker
    if (name === 'patientCensus' && selectedShift === ShiftType.NIGHT) {
      setInitialNightCensusFromMorning(null);
      // Also, potentially mark that census is now manually set if that flag is needed elsewhere
      // setIsCensusAutoCalculated(false); // Or a more specific flag for night shift manual override
    }

    setFormData(prevData => {
      const newData = {
        ...prevData,
        [name]: processedValue,
      };

      // Auto-recalculate Night Shift Patient Census if an admission/discharge field changed
      if (selectedShift === ShiftType.NIGHT && 
          !isFormReadOnly &&
          [
            'newAdmit', 'transferIn', 'referIn', 
            'discharge', 'transferOut', 'referOut', 'dead'
          ].includes(name) &&
          newData.patientCensus !== undefined // Ensure there was a patient census to begin with for night shift (use newData here as it's already updated if patientCensus itself was changed)
      ) {
        let baseNightCensusForCalculation: number;

        if (initialNightCensusFromMorning !== null && name !== 'patientCensus') {
          baseNightCensusForCalculation = initialNightCensusFromMorning;
        } else {
          // ใช้ค่า patientCensus ก่อนหน้าการเปลี่ยนแปลงครั้งนี้เป็น base
          baseNightCensusForCalculation = parseFloat(String(prevData.patientCensus)); 
        }
        
        if (isNaN(baseNightCensusForCalculation)) {
            console.warn("[useWardFormData] Base for night census calculation is NaN. Aborting recalculation for this change.", 
                         { baseValueSource: name === 'patientCensus' ? processedValue : newData.patientCensus });
            setIsFormDirty(true);
            console.log("[handleChange before return in NaN base] Final newData:", JSON.stringify(newData, null, 2));
            return newData; 
        }

        // Use values from newData for fields NOT being currently changed, and processedValue for the one that is.
        const nightAdmissions = 
          (Number(name === 'newAdmit'    ? processedValue : (newData.newAdmit    ?? 0))) +
          (Number(name === 'transferIn'  ? processedValue : (newData.transferIn  ?? 0))) +
          (Number(name === 'referIn'     ? processedValue : (newData.referIn     ?? 0)));

        const nightDischarges = 
          (Number(name === 'discharge'   ? processedValue : (newData.discharge   ?? 0))) +
          (Number(name === 'transferOut' ? processedValue : (newData.transferOut ?? 0))) +
          (Number(name === 'referOut'    ? processedValue : (newData.referOut    ?? 0))) +
          (Number(name === 'dead'        ? processedValue : (newData.dead        ?? 0)));
        
        // If the field being changed is an admission/discharge field, 
        // the patient census needs to be recalculated based on its *previous* value + delta.
        // If patientCensus itself was changed, that's the new value already set in newData.
        if (name !== 'patientCensus') {
            // ปรับการคำนวณให้ใช้ base ที่ถูกต้อง
            let actualBaseForCalculation = initialNightCensusFromMorning !== null 
                                           ? initialNightCensusFromMorning 
                                           : parseFloat(String(prevData.patientCensus)); // ใช้ค่าก่อนการเปลี่ยนแปลง

            if (isNaN(actualBaseForCalculation)) {
                console.warn("[useWardFormData] actualBaseForCalculation is NaN.", { prevDataCensus: prevData.patientCensus });
                actualBaseForCalculation = 0; // Fallback to 0 if NaN
            }

            const calculatedNightCensus = actualBaseForCalculation + nightAdmissions - nightDischarges;
            newData.patientCensus = Math.max(0, calculatedNightCensus);
            console.log(`[useWardFormData] Night census auto-recalculated (adm/disc change): Base=${actualBaseForCalculation}, Adm=${nightAdmissions}, Disc=${nightDischarges}, Result=${newData.patientCensus}`);
        } else {
            // If patientCensus itself was changed, `newData.patientCensus` already holds `processedValue`.
            // No further calculation needed here for patientCensus based on adm/disc.
            console.log(`[useWardFormData] Night patientCensus changed directly to: ${newData.patientCensus}`);
        }
      }
      setIsFormDirty(true); // Always set form dirty on change
      console.log("[handleChange before return] Final newData:", JSON.stringify(newData, null, 2));
      return newData;
    });

    // Validate on change if there was an error for this field
    if (errors[name]) {
      const fieldError = validateField(name as keyof WardForm, processedValue);
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: fieldError || '', 
      }));
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
          // อนุญาตให้เป็น 0 ได้ แต่ต้องไม่เป็น undefined, null, หรือ empty string
          if (value === undefined || value === null || value === '') {
            newErrors[field] = 'กรุณากรอกข้อมูลให้ครบถ้วน (กรอก 0 ถ้าไม่มีข้อมูล)';
            isValid = false;
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
    // สำหรับการบันทึกร่าง อนุญาตให้มีค่าว่างได้ แต่ถ้ามีค่า ต้องไม่ติดลบ
    else {
        requiredNumberFields.forEach(field => {
          const value = formData[field];
          if (value !== undefined && value !== null && value !== '' && typeof value === 'number' && value < 0) {
            newErrors[field] = 'ค่าต้องไม่ติดลบ';
            isValid = false;
          }
        });
    }

    setErrors(newErrors);
    return isValid;
  };

  // ฟังก์ชันตรวจสอบข้อมูลแต่ละฟิลด์
  const validateField = (fieldName: keyof WardForm, value: any): string | null => {
    const requiredNumberFields: (keyof WardForm)[] = [
      'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
      'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut',
      'discharge', 'dead', 'available', 'unavailable', 'plannedDischarge'
    ];
    const requiredStringFields: (keyof WardForm)[] = ['recorderFirstName', 'recorderLastName'];

    // ตรวจสอบฟิลด์ตัวเลข
    if (requiredNumberFields.includes(fieldName)) {
      // ค่า 0 ถือว่าถูกต้อง แต่ค่า undefined, null, หรือ empty string ถือว่าไม่ถูกต้อง
      if (value === 0) {
        return null; // ค่า 0 ถูกต้อง
      } else if (value === undefined || value === null || value === '') {
        return 'กรุณากรอกข้อมูลให้ครบถ้วน (กรอก 0 ถ้าไม่มีข้อมูล)';
      } else if (typeof value === 'number' && value < 0) {
        return 'ค่าต้องไม่ติดลบ';
      }
    } 
    // ตรวจสอบฟิลด์ข้อความ
    else if (requiredStringFields.includes(fieldName)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return 'กรุณากรอกข้อมูล';
      }
    }

    return null; // ไม่มี error
  };

  // จัดการ onBlur event สำหรับการตรวจสอบข้อมูลแบบเรียลไทม์
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof WardForm;

    // ตรวจสอบค่าจริงในฟอร์ม
    const stateValue = formData[fieldName];
    
    // เฉพาะเมื่อกำลังจะบันทึกแบบ final จึงจะตรวจสอบว่าข้อมูลครบถ้วนหรือไม่
    let errorMessage = null;
    if (saveActionType === 'final') {
      errorMessage = validateField(fieldName, stateValue);
    } else {
      // สำหรับการบันทึกร่าง ตรวจสอบเฉพาะค่าติดลบ
      if (stateValue !== undefined && stateValue !== null && stateValue !== '' && 
          typeof stateValue === 'number' && stateValue < 0) {
        errorMessage = 'ค่าต้องไม่ติดลบ';
      }
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (errorMessage) {
        newErrors[fieldName] = errorMessage;
      } else {
        delete newErrors[fieldName]; // ลบข้อผิดพลาดถ้าไม่มี error
      }
      return newErrors;
    });
  };

  // --- Function to check for zero values ---
  const getFieldsWithZeroValue = (data: Partial<WardForm>): string[] => {
    const zeroFields: string[] = [];
    const numericFields: (keyof WardForm)[] = [
      'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
      'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut',
      'discharge', 'dead', 'available', 'unavailable', 'plannedDischarge'
    ];
    numericFields.forEach(field => {
      // Check for exactly 0, not null or undefined
      if (data[field] === 0) {
        // Use the label from the mapping, fallback to field name
        zeroFields.push(WardFieldLabels[field] || field);
      }
    });
    return zeroFields;
  };

  // --- NEW Function to handle the actual save after zero confirmation ---
  const proceedWithSaveAfterZeroConfirmation = async () => {
    setShowConfirmZeroModal(false); // Close the zero modal first
    if (saveActionType === 'draft') {
      // Check for overwrite again, but execute save directly if needed (bypass second modal)
      try {
        if (isFormDirty) {
          const finalCheckDate = Timestamp.fromDate(new Date(selectedDate + 'T00:00:00'));
          const existingFinal = await getWardForm(finalCheckDate, selectedShift, selectedBusinessWardId);
          if (existingFinal && (existingFinal.status === FormStatus.FINAL || existingFinal.status === FormStatus.APPROVED)) {
            console.log("[ZeroConfirm] Overwrite needed, proceeding directly to draft save.");
            await executeDraftSave(); // Execute save directly, bypassing overwrite modal
            setSaveActionType(null); // Reset action type after execution
            return; // Exit after direct execution
          }
        }
        // If no overwrite needed, execute draft save normally
        await executeDraftSave();
      } catch (checkError) {
        console.error("[ZeroConfirm] Error checking overwrite, proceeding to save draft anyway:", checkError);
        await executeDraftSave(); // Save draft even if check fails
      }
    } else if (saveActionType === 'final') {
      await executeFinalSave();
    }
    setSaveActionType(null); // Reset action type
  };

  // --- Function to prepare data for saving ---
  const prepareDataForSave = async (finalSave: boolean = false): Promise<Partial<WardForm> | null> => {
    let wardName = formData.wardName;
    if (!wardName && selectedBusinessWardId) {
      // Simplified: Rely on wardName being present or optional for now
    }

    const currentFormData = { ...formData };
    const numericFields: (keyof WardForm)[] = [
      'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
      'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut',
      'discharge', 'dead', 'available', 'unavailable', 'plannedDischarge'
    ];

    const data: Partial<WardForm> = {
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

    // ปรับการจัดการค่าตัวเลข
    numericFields.forEach(field => {
      const value = currentFormData[field];
      
      if (finalSave) {
        // สำหรับการบันทึกสมบูรณ์ ทุกฟิลด์ห้ามเป็นค่าว่าง ต้องแปลงเป็นตัวเลขเสมอ (0 ถ้าไม่มีค่า)
        if (value === undefined || value === null || value === '') {
          (data as any)[field] = 0; // แปลงเป็น 0 ถ้าไม่มีค่า
        } else if (value === 0) {
          (data as any)[field] = 0; // ค่า 0 ยังคงเป็น 0
        } else if (typeof value === 'string') {
          // แปลงสตริงเป็นตัวเลข
          const numValue = parseFloat(value);
          (data as any)[field] = isNaN(numValue) ? 0 : numValue;
        } else if (typeof value === 'number') {
          (data as any)[field] = value; // ค่าตัวเลขคงเดิม
        }
      } else {
        // สำหรับการบันทึกร่าง
        if (value === undefined || value === null || value === '') {
          // บันทึกร่างอนุญาตให้เป็นค่าว่างได้ แต่ Firestore ไม่ชอบ undefined จึงใช้ null แทน
          (data as any)[field] = 0; // แปลงเป็น 0 เสมอเพื่อป้องกันปัญหากับ Firestore
        } else if (value === 0) {
          (data as any)[field] = 0; // ค่า 0 ยังคงเป็น 0
        } else if (typeof value === 'string') {
          // แปลงสตริงเป็นตัวเลข
          const numValue = parseFloat(value);
          (data as any)[field] = isNaN(numValue) ? 0 : numValue;
        } else if (typeof value === 'number') {
          (data as any)[field] = value; // ค่าตัวเลขคงเดิม
        }
      }
    });

    console.log("[prepareDataForSave] Prepared data:", JSON.stringify(data, null, 2));
    return data;
  };

  // --- Modified proceedToSaveDraft - now just executes the save ---
  const executeDraftSave = async () => {
      if (!user || !selectedBusinessWardId) return;
      setIsSaving(true);
      let savedDocId = ''; // Declare savedDocId here
      let dataToSave: Partial<WardForm> | null = null; // Declare dataToSave here
      try {
          dataToSave = await prepareDataForSave(false);
          if (!dataToSave) {
               showErrorToast("ไม่สามารถเตรียมข้อมูลสำหรับบันทึกร่างได้");
               setIsSaving(false);
               return;
          }
          savedDocId = await saveDraftWardForm(dataToSave, user); // Assign savedDocId
          showSafeToast(`บันทึกร่างสำเร็จ (ID: ${savedDocId})`, 'success');

          // <<< FIX: Update state based on successfully saved data >>>
          if (dataToSave) { // Ensure dataToSave is not null
            const savedDataForState: Partial<WardForm> = {
              ...dataToSave, // Use the data that was actually saved
              id: savedDocId, // Ensure the correct ID is set
              status: FormStatus.DRAFT, // Confirm status
              isDraft: true, // Confirm draft status
              // Convert Timestamp back to string for the date input if necessary
              date: dataToSave.date instanceof Timestamp ? format(dataToSave.date.toDate(), 'yyyy-MM-dd') : selectedDate,
            };
            console.log('[executeDraftSave] Updating state with saved data:', JSON.stringify(savedDataForState, null, 2));
            setFormData(savedDataForState);
          } else {
             console.error("[executeDraftSave] dataToSave was null after successful save, cannot update state accurately.");
             // Fallback or error handling? For now, just log.
          }

          setIsFormDirty(false);
          setIsDraftLoaded(true);
      } catch (error) {
          console.error("[useWardFormData] Error saving draft:", error);
          showErrorToast(`เกิดข้อผิดพลาดในการบันทึกร่าง: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
          setIsSaving(false);
      }
  };

  // --- NEW Function to handle overwrite check (separated from proceedToSaveDraft) ---
  const checkOverwriteAndProceedWithDraft = async () => {
    try {
        // Check if the form is dirty AND if there's existing FINAL/APPROVED data
        if (isFormDirty) {
            const finalCheckDate = Timestamp.fromDate(new Date(selectedDate + 'T00:00:00'));
            const existingFinal = await getWardForm(finalCheckDate, selectedShift, selectedBusinessWardId);
            if (existingFinal && (existingFinal.status === FormStatus.FINAL || existingFinal.status === FormStatus.APPROVED)) {
                 console.log("[handleSaveDraft] Final/Approved data exists and form is dirty. Showing overwrite modal.");
                 setShowConfirmOverwriteModal(true); // Show overwrite modal
                 return; // Wait for overwrite modal confirmation
            }
        }
        // If no overwrite needed, execute draft save
        await executeDraftSave();
    } catch (checkError) {
        console.error("[handleSaveDraft] Error checking for existing final form:", checkError);
        // Proceed to save anyway if check fails? Or show warning?
        await executeDraftSave(); // Proceed with draft save even if check fails for now
    }
  };

  // --- Modified handleSaveDraft to check for zeros first ---
  const handleSaveDraft = async () => {
    if (!user || !selectedBusinessWardId || !selectedDate || !selectedShift || isSaving) return;

    setSaveActionType('draft'); // Set the intended action

    // <<< Check for zero values >>>
    const zeroFields = getFieldsWithZeroValue(formData);
    if (zeroFields.length > 0) {
      console.log('[handleSaveDraft] Fields with zero value found:', zeroFields);
      setFieldsWithValueZero(zeroFields);
      setShowConfirmZeroModal(true); // Show zero confirmation modal
      return; // Wait for confirmation
    }

    // If no zeros, proceed to check overwrite
    await checkOverwriteAndProceedWithDraft();
  };


  // --- NEW: Function to execute the final save logic ---
  const executeFinalSave = async () => {
    if (!user || !selectedBusinessWardId || isSaving) return;

    // Validate form for final save
    if (!validateForm(true)) {
      showErrorToast("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้องก่อนบันทึกสมบูรณ์");
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.focus();
      }
      return;
    }

    const currentFormData = { ...formData };
    setIsSaving(true);
    try {
      const dataToSave = await prepareDataForSave(true);
      if (!dataToSave) {
        showErrorToast("ไม่สามารถเตรียมข้อมูลสำหรับบันทึกสมบูรณ์ได้");
        setIsSaving(false);
        return;
      }

      let savedDocId = '';
      console.log(`[useWardFormData] Finalizing ${selectedShift} shift data:`, dataToSave);

      if (selectedShift === ShiftType.MORNING) {
        savedDocId = await finalizeMorningShiftForm(dataToSave, user);
      } else {
        savedDocId = await finalizeNightShiftForm(dataToSave, user);
      }

      console.log(`[handleSaveFinal] Save completed, document ID: ${savedDocId}`);
      showSafeToast(`บันทึกข้อมูลสมบูรณ์สำเร็จ (ID: ${savedDocId})`, 'success');

      const finalStateData: Partial<WardForm> = {
        ...currentFormData,
        id: savedDocId,
        status: FormStatus.FINAL,
        isDraft: false,
        date: typeof currentFormData.date === 'string' ? currentFormData.date : selectedDate,
      };

      setFormData(finalStateData);
      setIsFormDirty(false);
      setIsFormReadOnly(true);
      setIsDraftLoaded(false);
      setIsFinalDataFound(true);

    } catch (error) {
      console.error("[useWardFormData] Error saving final:", error);
      showErrorToast(`เกิดข้อผิดพลาดในการบันทึกสมบูรณ์: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Modified handleSaveFinal to check for zeros first ---
  const handleSaveFinal = async () => {
    if (!user || !selectedBusinessWardId || isSaving) return;

    setSaveActionType('final'); // Set the intended action

    // <<< Check for zero values >>>
    const zeroFields = getFieldsWithZeroValue(formData);
    if (zeroFields.length > 0) {
      console.log('[handleSaveFinal] Fields with zero value found:', zeroFields);
      setFieldsWithValueZero(zeroFields);
      setShowConfirmZeroModal(true); // Show zero confirmation modal
      return; // Wait for confirmation
    }

    // If no zeros, proceed directly to final save execution
    await executeFinalSave();
  };


  // --- Expose new states and functions ---
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
    // --- Zero Confirmation ---
    showConfirmZeroModal,
    setShowConfirmZeroModal,
    fieldsWithValueZero,
    proceedWithSaveAfterZeroConfirmation,
    // --- Overwrite Confirmation ---
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft: executeDraftSave,
  };
}; 