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

// Global toast tracker to prevent duplicates across component re-renders
const globalToastTracker = {
  previousNightNotFound: false,
  previousNightApproved: false,
  previousNightFinal: false,
  previousNightDraft: false,
  formLoaded: false,
  pastDataReadOnly: false,
  generalError: false,
  draftLoaded: false
};

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
  const [existingDraftData, setExistingDraftData] = useState<WardForm | null>(null);
  const [isCensusAutoCalculated, setIsCensusAutoCalculated] = useState(false);
  const toastShownRef = useRef({ morning: false, night: false, error: false, load: false }); // Ref to track toasts
  const [error, setError] = useState<string | null>(null); // General error state
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  
  // Function to safely show toast without duplicates
  const safeShowToast = (message: string, type: 'info' | 'error' | 'warning', toastKey: keyof typeof globalToastTracker) => {
    if (!globalToastTracker[toastKey]) {
      showSafeToast(message, type);
      globalToastTracker[toastKey] = true;
    }
  };

  // Reset all toast trackers when inputs change significantly
  useEffect(() => {
    // Reset global toast trackers when key inputs change
    Object.keys(globalToastTracker).forEach(key => {
      globalToastTracker[key as keyof typeof globalToastTracker] = false;
    });
    
    // Only proceed with data loading if we have the required inputs
    if (!selectedWard || !selectedDate || !user) {
        setFormData({}); // Reset to empty object
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setExistingDraftData(null);
        setIsCensusAutoCalculated(false);
        return;
    }

    const loadData = async () => {
        setIsLoading(true);
        setErrors({});
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setFormData({}); // Reset to empty object initially
        setIsCensusAutoCalculated(false);
        setError(null); // Reset error on load
        setIsDraftLoaded(false); // Reset draft loaded

        try {
          const targetDate = new Date(selectedDate + 'T00:00:00');
          const dateTimestamp = Timestamp.fromDate(targetDate);

          // Fetch Previous Night Shift Form Data (only needed for Morning Shift)
          let previousNightForm: WardForm | null = null;
          if (selectedShift === ShiftType.MORNING) {
              previousNightForm = await getLatestPreviousNightForm(targetDate, selectedWard);
              if (previousNightForm?.patientCensus !== undefined) {
                // Check approval status
                if (previousNightForm.status === FormStatus.APPROVED) {
                   // Approved, load census and make read-only
                   safeShowToast('พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน (อนุมัติแล้ว)', 'info', 'previousNightApproved');
                   setFormData(prev => ({ ...prev, patientCensus: Number(previousNightForm!.patientCensus) }));
                   setIsMorningCensusReadOnly(true);
                   setIsCensusAutoCalculated(true);
                 } else if (previousNightForm.status === FormStatus.FINAL) {
                    // Final but not Approved
                    safeShowToast('พบข้อมูล Save Final คงพยาบาลจากกะดึกคืนก่อน แต่ยังไม่ได้ Approval กรุณาติดต่อฝ่ายการ และ Surveyor', 'warning', 'previousNightFinal');
                    // Do not set patient census, ensure it's undefined or handled correctly
                    setFormData(prev => ({...prev, patientCensus: undefined }));
                    setIsMorningCensusReadOnly(false);
                    setIsCensusAutoCalculated(false);
                 } else if (previousNightForm.status === FormStatus.DRAFT) {
                    // Draft
                    safeShowToast('พบข้อมูล Save Draft คงพยาบาลจากกะดึกคืนก่อน รบกวน Save Final และ ให้ Surveyor อนุมัติก่อน', 'warning', 'previousNightDraft');
                    // Do not set patient census, ensure it's undefined
                    setFormData(prev => ({...prev, patientCensus: undefined }));
                  setIsMorningCensusReadOnly(false);
                  setIsCensusAutoCalculated(false);
                } else {
                   // Unexpected status or DRAFT (treat DRAFT as needing finalization first)
                   safeShowToast('ข้อมูลกะดึกคืนก่อนยังไม่สมบูรณ์/อนุมัติ Patient Census จะยังไม่แสดงผลอัตโนมัติ', 'warning', 'previousNightDraft');
                   // Do not set patient census, ensure it's undefined
                   setFormData(prev => ({...prev, patientCensus: undefined }));
                   setIsMorningCensusReadOnly(false);
                   setIsCensusAutoCalculated(false);
                }
              } else {
                // No previous night form found
                safeShowToast('ไม่พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน กรุณากรอกข้อมูล', 'warning', 'previousNightNotFound');
                // Ensure patientCensus is not set from previous night
                setFormData(prev => ({...prev, patientCensus: undefined }));
                setIsMorningCensusReadOnly(false);
                setIsCensusAutoCalculated(false); // Ensure this is false if no previous form
              }
          } else {
              // Night shift: ensure patient census starts undefined unless loaded later
              setFormData(prev => ({...prev, patientCensus: undefined }));
              setIsMorningCensusReadOnly(false); // Not applicable
              setIsCensusAutoCalculated(false); // Not applicable
          }

          // Fetch Existing Form Data for the selected shift
          const existingForm = await getWardForm(dateTimestamp, selectedShift, selectedWard);

          if (existingForm) {
            console.log('[useWardFormData] Existing form found:', existingForm); // Log fetched data

            const loadedData: Partial<WardForm> = {
                  ...existingForm,
                  // Convert Timestamp to yyyy-MM-dd string for the input field
                  date: existingForm.date instanceof Timestamp ? format(existingForm.date.toDate(), 'yyyy-MM-dd') : existingForm.date,
              discharge: Number(existingForm.discharge ?? undefined), // Ensure number or undefined
              dead: Number(existingForm.dead ?? undefined),
              available: Number(existingForm.available ?? undefined),
              unavailable: Number(existingForm.unavailable ?? undefined),
              plannedDischarge: Number(existingForm.plannedDischarge ?? undefined),
            };

            // If morning census was auto-calculated, override the loaded value
            if (selectedShift === ShiftType.MORNING && isCensusAutoCalculated && previousNightForm?.patientCensus !== undefined) {
                loadedData.patientCensus = Number(previousNightForm.patientCensus);
            }

            setFormData(loadedData); // Set the loaded data (already Partial<WardForm>)
               console.log('[useWardFormData] Set formData state:', loadedData); // Log state after setting

            // Determine Read Only status for the whole form first
            const isFinalOrApproved = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
            setIsFormReadOnly(isFinalOrApproved);

            // Show appropriate toast based on status and date
            const isPastDate = new Date(selectedDate + 'T00:00:00') < new Date(format(new Date(), 'yyyy-MM-dd') + 'T00:00:00');
            if (isFinalOrApproved && isPastDate) {
                // Specific toast for past, read-only forms
                safeShowToast('นี่คือข้อมูลย้อนหลัง จะไม่สามารถบันทึกซ้ำได้ หากต้องการแก้ไข กรุณาติดต่อฝ่ายการพยาบาล หรือ Surveyor', 'info', 'pastDataReadOnly');
            } else {
                // General toast for loading existing data (draft or current final/approved)
                safeShowToast(`โหลดข้อมูล${existingForm.isDraft ? 'ร่าง' : 'ที่บันทึกสมบูรณ์'}สำหรับกะ${selectedShift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}แล้ว`, 'info', 'formLoaded');
            }

               if (selectedShift === ShiftType.MORNING && isMorningCensusReadOnly) {
                  setIsCensusAutoCalculated(true);
               }
            
            if (existingForm?.status === FormStatus.DRAFT) {
              setIsDraftLoaded(true);
              safeShowToast("ข้อมูลร่างสำหรับกะนี้ถูกโหลดแล้ว", 'info', 'draftLoaded');
            }

            // Apply previous night census ONLY if it was APPROVED
            if (selectedShift === ShiftType.MORNING && previousNightForm?.status === FormStatus.APPROVED && previousNightForm.patientCensus !== undefined) {
                setFormData(prev => ({
                    ...prev, // Keep other potential fields if any were set before
                    patientCensus: Number(previousNightForm.patientCensus) // Set the approved census
                }));
                setIsMorningCensusReadOnly(true);
                setIsCensusAutoCalculated(true);
            } else {
                // Otherwise (Morning shift but prev night not approved/found, or Night shift)
                // Ensure the form starts with undefined census if not loaded/approved
                if (selectedShift === ShiftType.MORNING) {
                     setFormData(prev => ({ ...prev, patientCensus: undefined }));
                }
                // For night shift, patientCensus should already be undefined from earlier logic
                setIsMorningCensusReadOnly(false); // Ensure editable
                setIsCensusAutoCalculated(false); // Ensure not marked as auto
                // Toast for missing/unapproved previous night shown earlier
            }

            // Update recorder names IF:
            // 1. A user is logged in
            // 2. We are NOT loading an existing FINAL or APPROVED form
            // 3. The field wasn't already populated (e.g., from a loaded draft)
            if (user && !(existingForm && (existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED))) {
              setFormData(prev => ({
                ...prev,
                // Only set if the current value in state is empty/falsy
                recorderFirstName: prev.recorderFirstName || user.firstName || '',
                recorderLastName: prev.recorderLastName || user.lastName || '',
              }));
            }

          } else {
             console.log('No existing form found for this shift.');
             // If no existing form, apply previous night census if applicable (check patientCensus)
             if (selectedShift === ShiftType.MORNING && previousNightForm && previousNightForm.patientCensus !== undefined) {
               // Only set if the previous night form was approved
               if(previousNightForm.status === FormStatus.APPROVED) {
                 setFormData(prev => ({
                   ...initialFormStructure,
                   patientCensus: previousNightForm.patientCensus,
                   // Set initial recorder names here too when creating new form
                   recorderFirstName: user?.firstName || '',
                   recorderLastName: user?.lastName || '',
                 }));
                 setIsMorningCensusReadOnly(true);
                 setIsCensusAutoCalculated(true);
               } else {
                  // Not approved / Draft / Final / Not Found - set to initial, keep editable
                  setFormData({
                    ...initialFormStructure,
                    // Set initial recorder names here too
                    recorderFirstName: user?.firstName || '',
                    recorderLastName: user?.lastName || '',
                  });
                  setIsMorningCensusReadOnly(false);
                  setIsCensusAutoCalculated(false);
                  // Relevant toast already shown above based on status
               }
             } else {
               // No previous night form or not Morning Shift - set initial structure
               setFormData({
                 ...initialFormStructure,
                 // Set initial recorder names here too
                 recorderFirstName: user?.firstName || '',
                 recorderLastName: user?.lastName || '',
               });
               setIsMorningCensusReadOnly(false);
             }
             setIsFormReadOnly(false);
             setIsDraftLoaded(false); // Ensure draft loaded is false if no existing form
          }

          const latestDraft = await getLatestDraftForm(selectedWard, user); 
          setExistingDraftData(latestDraft);

        } catch (error) {
          console.error("Error loading existing form data:", error);
          safeShowToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error', 'generalError');
          setFormData({}); // Reset to empty object on error
          setIsMorningCensusReadOnly(false);
          setIsFormReadOnly(false);
          setExistingDraftData(null);
          setIsCensusAutoCalculated(false);
          setError((error as Error).message); // Set general error using error.message
        } finally {
          setIsLoading(false);
        }
    };

    loadData();

  }, [selectedWard, selectedDate, selectedShift, user, morningShiftStatus, nightShiftStatus]); // Add morningShiftStatus and nightShiftStatus as dependencies

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | undefined;

    if (type === 'number') {
      if (value === '') {
        processedValue = undefined; // Treat empty string as undefined for number state
      } else if (/^\d+$/.test(value)) { // Allow only non-negative integers
        processedValue = Number(value);
      } else {
        // If input is invalid number (e.g., contains non-digits, or is negative if min=0)
        // Do not update state, or show validation message immediately?
        // For now, let's prevent state update for invalid number input
        // Or alternatively, set it back to previous valid state? No, just ignore invalid input
        return; // Or maybe show a transient error/shake?
      }
    } else {
      processedValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear validation error for the field being changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // นับเป็นการมีปฏิสัมพันธ์กับฟอร์ม ล้าง error ทั่วไป
    if (error) {
        setError(null);
    }
  };

  return {
    formData,
    setFormData, // Expose setter for direct updates if needed (e.g., after save)
    errors,
    setErrors, // Expose setter for validation
    isLoading,
    isSaving,
    setIsSaving, // Expose setter for save functions
    isMorningCensusReadOnly,
    isFormReadOnly,
    setIsFormReadOnly, // Pass down to useFormPersistence
    existingDraftData,
    setExistingDraftData, // Add missing setter
    isCensusAutoCalculated, // <-- Return new state
    handleChange,
    error,          // <-- Return error
    setError,       // <-- Return setError
    isDraftLoaded,  // <-- Return isDraftLoaded
  };
}; 