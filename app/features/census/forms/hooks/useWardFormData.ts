'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { getWardForm, getLatestPreviousNightForm, getLatestDraftForm } from '../services/wardFormService';
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
  const toastShownRef = useRef({ morning: false, night: false, error: false, load: false, final: false, draft: false }); // Ref to track toasts, added final/draft
  const [error, setError] = useState<string | null>(null); // General error state
  const [isDraftLoaded, setIsDraftLoaded] = useState(false); // Indicates if CURRENTLY displayed data is a loaded draft
  const [isFinalDataFound, setIsFinalDataFound] = useState(false); // NEW: Indicates if FINAL data exists for the selection

  useEffect(() => {
    // Reset states dependent on selection change
    toastShownRef.current = { morning: false, night: false, error: false, load: false, final: false, draft: false }; // Reset toasts on change
    setError(null);
    setErrors({}); // Clear errors on selection change

    if (!selectedWard || !selectedDate || !user) {
        setFormData({});
        setIsLoading(false);
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setIsCensusAutoCalculated(false);
        setIsDraftLoaded(false);
        setIsFinalDataFound(false);
        return;
    }

    const loadData = async () => {
        setIsLoading(true);
        // Reset states before loading new data
        setFormData({});
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setIsCensusAutoCalculated(false);
        setIsDraftLoaded(false);
        setIsFinalDataFound(false); // Reset new state

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
                    if (!toastShownRef.current.final) {
                       showSafeToast(`ข้อมูลบันทึกสมบูรณ์/อนุมัติสำหรับกะนี้ ถูกโหลดแล้ว (อ่านอย่างเดียว)`, 'info');
                       toastShownRef.current.final = true;
                    }
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
                    if (!toastShownRef.current.draft) {
                       showSafeToast("กำลังแสดงข้อมูลฉบับร่างที่มีอยู่สำหรับกะนี้", 'warning'); // Use warning color for draft
                       toastShownRef.current.draft = true;
                    }
                     if (selectedShift === ShiftType.MORNING) {
                        // If draft for morning, it's editable, census not forced read-only from previous night
                        setIsMorningCensusReadOnly(false);
                        setIsCensusAutoCalculated(false); // Don't auto-calculate display if loading draft
                    }
                }
                setFormData(loadedData);

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
                         showSafeToast('เกิดข้อผิดพลาดในการดึงข้อมูลกะกลางคืนก่อนหน้า', 'error');
                    }

                    if (previousNightForm?.patientCensus !== undefined) {
                        if (previousNightForm.status === FormStatus.APPROVED) {
                            initialData.patientCensus = Number(previousNightForm.patientCensus);
                            setIsMorningCensusReadOnly(true);
                            setIsCensusAutoCalculated(true);
                             if (!toastShownRef.current.morning) {
                                showSafeToast('Patient Census ถูกดึงจากข้อมูลกะดึก (อนุมัติแล้ว)', 'info');
                                toastShownRef.current.morning = true;
                             }
                        } else {
                             setIsMorningCensusReadOnly(false);
                             setIsCensusAutoCalculated(false);
                              if (!toastShownRef.current.morning) {
                                  const message = previousNightForm.status === FormStatus.FINAL
                                      ? 'ข้อมูล Save Final กะดึกยังไม่ได้ Approval กรุณาติดต่อฝ่ายการ/Surveyor'
                                      : previousNightForm.status === FormStatus.DRAFT
                                          ? 'ข้อมูล Save Draft กะดึกยังไม่สมบูรณ์/อนุมัติ'
                                          : 'ข้อมูลกะดึกยังไม่สมบูรณ์/อนุมัติ';
                                  showSafeToast(`${message}. Patient Census จะไม่ถูกโหลดอัตโนมัติ`, 'warning');
                                  toastShownRef.current.morning = true;
                              }
                        }
                    } else {
                         setIsMorningCensusReadOnly(false);
                         setIsCensusAutoCalculated(false);
                          if (!toastShownRef.current.morning) {
                             showSafeToast('ไม่พบข้อมูล Patient Census จากกะดึกคืนก่อน', 'warning');
                             toastShownRef.current.morning = true;
                          }
                    }
                 } else {
                     // Night shift, no previous night logic needed here
                     setIsMorningCensusReadOnly(false);
                     setIsCensusAutoCalculated(false);
                 }
                 setFormData(initialData); // Set initial data (possibly with auto-census)
            }

        } catch (err) { // Catch block for the main try
          console.error("Error in loadData:", err);
          if (!toastShownRef.current.error) {
            showSafeToast('เกิดข้อผิดพลาดในการโหลดข้อมูลฟอร์ม', 'error');
            toastShownRef.current.error = true;
          }
          setFormData({ // Reset to minimal initial state on error
            ...initialFormStructure,
             recorderFirstName: user?.firstName || '',
             recorderLastName: user?.lastName || '',
          });
          setIsMorningCensusReadOnly(false);
          setIsFormReadOnly(false);
          setIsCensusAutoCalculated(false);
          setIsDraftLoaded(false);
          setIsFinalDataFound(false);
          setError((err as Error).message);
        } finally {
          setIsLoading(false);
        }
    };

    loadData();

  }, [selectedWard, selectedDate, selectedShift, user]); // Simplify dependencies - shift status might not be needed directly here anymore

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | undefined;

    if (type === 'number') {
      if (value === '') {
        processedValue = undefined; // Treat empty string as undefined for number state
      } else if (/^\\d+$/.test(value)) { // Allow only non-negative integers
        processedValue = Number(value);
      } else {
        // If input is invalid number (e.g., contains non-digits, or is negative if min=0)
        // Do not update state, or show validation message immediately?
        // For now, let's prevent state update for invalid number input
        // Or alternatively, set it back to previous valid state? No, just ignore invalid input
        return; // Prevent update for invalid number sequences like '1e', '1.', '-' etc.
      }
    } else {
      processedValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
      // Automatically update isDraft flag when user edits
      isDraft: true,
      status: FormStatus.DRAFT, // Ensure status reflects draft when editing
    }));

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

  const handleSaveDraft = async () => {
     if (isFormReadOnly) {
        showErrorToast('ไม่สามารถบันทึกร่างข้อมูลที่ Finalized แล้วได้');
        return;
     }

     setIsSaving(true);
     // No strict validation needed for draft? Or basic non-negative check?
     // Let's enforce non-negative for numbers even in draft
     if (!validateForm(false)) { // Use validateForm(false) for basic checks
        showErrorToast('ข้อมูลบางส่วนไม่ถูกต้อง (ค่าต้องไม่ติดลบ)');
        setIsSaving(false);
        return;
     }

     try {
       const dataToSave: Partial<WardForm> = {
         ...formData,
         date: Timestamp.fromDate(new Date(selectedDate + 'T00:00:00')),
         shift: selectedShift,
         status: FormStatus.DRAFT,
         isDraft: true,
         createdBy: user?.uid || '', // Add user info
         updatedAt: Timestamp.now(), // Add timestamp
         // Ensure recorder names are included from state
         recorderFirstName: formData.recorderFirstName || user?.firstName || '',
         recorderLastName: formData.recorderLastName || user?.lastName || '',
       };

       // Generate a unique ID or use a predictable one for drafts?
       // Using a predictable one allows overwriting the same draft easily.
       const docId = `Wards_${selectedWard}_${selectedDate}_${selectedShift}_draft`; // Predictable ID

       // Call service function to save/update draft
       // Assuming your service function handles upsert logic based on docId
       // await saveWardForm(docId, dataToSave);
       console.log("Draft save function needs implementation/update"); // Placeholder
       showInfoToast('บันทึกฉบับร่างสำเร็จ');

     } catch (err) {
       console.error("Error saving draft:", err);
       showErrorToast('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง');
     } finally {
       setIsSaving(false);
     }
  };

  const handleSaveFinal = async () => {
     if (isFormReadOnly) {
        showErrorToast('ข้อมูลนี้ถูกบันทึกสมบูรณ์แล้ว ไม่สามารถแก้ไขได้');
        return;
     }

    if (!validateForm(true)) {
      showErrorToast('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วนและถูกต้อง');
      return;
    }
    setIsSaving(true);
    try {
       const dataToSave: Partial<WardForm> = {
         ...formData,
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
       };

       // Generate docId for final save (could be same predictable pattern or different)
       const docId = `Wards_${selectedWard}_${selectedDate}_${selectedShift}_final`; // Example final ID

       // Call service function to save final data
       // await saveWardForm(docId, dataToSave); // Assuming service handles saving final
       console.log("Final save function needs implementation/update"); // Placeholder
       showSafeToast('บันทึกข้อมูลสมบูรณ์ (Final) สำเร็จ!', 'success');
       setIsFormReadOnly(true); // Make form read-only after successful final save

     } catch (err) {
       console.error("Error saving final:", err);
       showErrorToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลสมบูรณ์');
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
    handleSaveDraft,
    handleSaveFinal,
    validateForm,
    error, // Pass general error state
    isDraftLoaded, // Pass flag for draft background styling
    isFinalDataFound, // Pass flag for final notification/read-only
  };
}; 