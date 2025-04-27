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
  const [existingDraftData, setExistingDraftData] = useState<WardForm | null>(null);
  const [isCensusAutoCalculated, setIsCensusAutoCalculated] = useState(false);
  const toastShownRef = useRef({ morning: false, night: false, error: false, load: false }); // Ref to track toasts
  const [error, setError] = useState<string | null>(null); // General error state
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  
  useEffect(() => {
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
              
              // Fetch Existing Form Data for the selected shift FIRST
              const existingForm = await getWardForm(dateTimestamp, selectedShift, selectedWard);
              const existingDraftLoaded = existingForm?.status === FormStatus.DRAFT;
              setIsDraftLoaded(existingDraftLoaded); // Set draft status early
              
              if (previousNightForm?.patientCensus !== undefined) {
                // Check approval status of previous night
                if (previousNightForm.status === FormStatus.APPROVED) {
                   showSafeToast('พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน (อนุมัติแล้ว)', 'info');
                   // Set census later, after loading existingForm data
                   setIsMorningCensusReadOnly(true);
                   setIsCensusAutoCalculated(true);
                 } else if (previousNightForm.status === FormStatus.FINAL) {
                    showSafeToast('พบข้อมูล Save Final คงพยาบาลจากกะดึกคืนก่อน แต่ยังไม่ได้ Approval กรุณาติดต่อฝ่ายการ และ Surveyor', 'warning');
                    setIsMorningCensusReadOnly(false);
                    setIsCensusAutoCalculated(false);
                 } else if (previousNightForm.status === FormStatus.DRAFT) {
                    showSafeToast('พบข้อมูล Save Draft คงพยาบาลจากกะดึกคืนก่อน รบกวน Save Final และ ให้ Surveyor อนุมัติก่อน', 'warning');
                  setIsMorningCensusReadOnly(false);
                  setIsCensusAutoCalculated(false);
                } else {
                   showSafeToast('ข้อมูลกะดึกคืนก่อนยังไม่สมบูรณ์/อนุมัติ Patient Census จะยังไม่แสดงผลอัตโนมัติ', 'warning');
                   setIsMorningCensusReadOnly(false);
                   setIsCensusAutoCalculated(false);
                }
              } else {
                // No previous night form found - BUT ONLY SHOW TOAST IF NO DRAFT EXISTS FOR CURRENT SHIFT
                if (!existingDraftLoaded) { 
                    showSafeToast('ไม่พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน กรุณากรอกข้อมูล', 'warning');
                }
                setIsMorningCensusReadOnly(false);
                setIsCensusAutoCalculated(false); 
              }
          } else {
              // Night shift: No previous night check needed here
              setIsMorningCensusReadOnly(false); 
              setIsCensusAutoCalculated(false); 
          }

          // Fetch Existing Form Data (moved earlier for morning shift)
          const existingForm = selectedShift === ShiftType.NIGHT 
              ? await getWardForm(dateTimestamp, selectedShift, selectedWard)
              : (await getWardForm(dateTimestamp, ShiftType.MORNING, selectedWard)); // Reuse fetched data if morning

          if (existingForm) {
            console.log('[useWardFormData] Existing form found:', existingForm); 

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

            // Override patient census based on previous night check (if applicable)
            if (selectedShift === ShiftType.MORNING && isCensusAutoCalculated && previousNightForm?.status === FormStatus.APPROVED) {
                loadedData.patientCensus = Number(previousNightForm.patientCensus);
            }

            // Set recorder names: Prioritize loaded non-empty name, otherwise use current user's name.
            // Apply this logic BEFORE setting the state.
            if (user) { 
                const isFinalOrApprovedForm = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
                if (!isFinalOrApprovedForm) {
                    // If not final/approved, use loaded name if it exists, otherwise use current user's name
                    loadedData.recorderFirstName = loadedData.recorderFirstName?.trim() ? loadedData.recorderFirstName : (user.firstName || '');
                    loadedData.recorderLastName = loadedData.recorderLastName?.trim() ? loadedData.recorderLastName : (user.lastName || '');
                } else {
                    // If final/approved, just ensure the values are strings (use loaded or empty string)
                    loadedData.recorderFirstName = loadedData.recorderFirstName || '';
                    loadedData.recorderLastName = loadedData.recorderLastName || '';
                }
            }

            setFormData(loadedData); // Set state with potentially updated recorder names

            // Set ReadOnly status
            const isFinalOrApproved = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
            setIsFormReadOnly(isFinalOrApproved);

            // Show appropriate toast (loading/past data)
            // The "previous night not found" toast is now handled conditionally above
            const isPastDate = new Date(selectedDate + 'T00:00:00') < new Date(format(new Date(), 'yyyy-MM-dd') + 'T00:00:00');
            if (isFinalOrApproved && isPastDate) {
                showSafeToast('นี่คือข้อมูลย้อนหลัง (บันทึกสมบูรณ์/อนุมัติแล้ว)', 'info');
            } else if (existingForm.status === FormStatus.DRAFT) { // Show draft loaded toast specifically
                showSafeToast("ข้อมูลร่างสำหรับกะนี้ถูกโหลดแล้ว", 'info');
            } else if (isFinalOrApproved) { // Show final/approved loaded toast
                 showSafeToast(`โหลดข้อมูลที่บันทึกสมบูรณ์/อนุมัติสำหรับกะนี้แล้ว`, 'info');
            }

          } else {
             console.log('No existing form found for this shift.');
             // Apply previous night census if applicable (only if approved)
             if (selectedShift === ShiftType.MORNING && previousNightForm?.status === FormStatus.APPROVED && previousNightForm.patientCensus !== undefined) {
                 setFormData(prev => ({
                   ...initialFormStructure,
                   patientCensus: previousNightForm.patientCensus,
                   recorderFirstName: user?.firstName || '',
                   recorderLastName: user?.lastName || '',
                 }));
                 // isMorningCensusReadOnly and isCensusAutoCalculated already set above
             } else {
               // No previous night or not approved, or night shift
               setFormData({
                 ...initialFormStructure,
                 recorderFirstName: user?.firstName || '',
                 recorderLastName: user?.lastName || '',
               });
               // isMorningCensusReadOnly and isCensusAutoCalculated already set above or not applicable
             }
             setIsFormReadOnly(false);
             // isDraftLoaded already set above based on the check
          }

          // Fetch latest draft data (for potential overwrite logic)
          const latestDraft = await getLatestDraftForm(selectedWard, user); 
          setExistingDraftData(latestDraft);

        } catch (error) {
          console.error("Error loading existing form data:", error);
          showSafeToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
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