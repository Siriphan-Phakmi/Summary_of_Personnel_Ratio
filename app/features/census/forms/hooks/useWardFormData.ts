'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { getWardForm, getPreviousNightShiftForm, getLatestDraftForm } from '../services/wardFormService';
import { showInfoToast, showErrorToast } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

const initialFormData: Partial<WardForm> = {
  patientCensus: 0,
  nurseManager: 0,
  rn: 0,
  pn: 0,
  wc: 0,
  newAdmit: 0,
  transferIn: 0,
  referIn: 0,
  transferOut: 0,
  referOut: 0,
  discharge: 0,
  dead: 0,
  available: 0,
  unavailable: 0,
  plannedDischarge: 0,
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
  const [formData, setFormData] = useState<Partial<WardForm>>(initialFormData);
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
    if (!selectedWard || !selectedDate || !user) {
        setFormData(initialFormData);
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setExistingDraftData(null);
        // Reset toast flags when inputs change
        toastShownRef.current = { morning: false, night: false, error: false, load: false };
        setIsCensusAutoCalculated(false);
        return;
    }

    // Reset toast flags for this specific load cycle
    toastShownRef.current.morning = false;
    toastShownRef.current.night = false;
    toastShownRef.current.error = false;
    toastShownRef.current.load = false;

    const loadData = async () => {
        setIsLoading(true);
        setErrors({});
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setFormData(initialFormData);
        setIsCensusAutoCalculated(false);
        setError(null); // Reset error on load
        setIsDraftLoaded(false); // Reset draft loaded

        try {
          const targetDate = new Date(selectedDate + 'T00:00:00');
          const dateTimestamp = Timestamp.fromDate(targetDate);

          // Fetch Previous Night Shift Form Data (only needed for Morning Shift)
          let previousNightForm: WardForm | null = null;
          if (selectedShift === ShiftType.MORNING) {
              previousNightForm = await getPreviousNightShiftForm(targetDate, selectedWard);
              if (previousNightForm?.patientCensus !== undefined) {
                // Check approval status
                if (previousNightForm.status !== FormStatus.APPROVED) {
                   if (!toastShownRef.current.morning) { // Use morning flag for this specific warning
                    showInfoToast('ข้อมูลกะดึกคืนก่อนยังไม่ได้รับการอนุมัติ Patient Census จะยังไม่แสดงผลอัตโนมัติ');
                    toastShownRef.current.morning = true;
                   }
                  // Do not set patient census automatically, keep it editable
                  setIsMorningCensusReadOnly(false);
                  setIsCensusAutoCalculated(false);
                } else {
                  // Approved, load census and make read-only
                  if (!toastShownRef.current.morning) { // Use morning flag for success too
                    showInfoToast('พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน (อนุมัติแล้ว)');
                    toastShownRef.current.morning = true;
                  }
                  setFormData(prev => ({ ...prev, patientCensus: previousNightForm!.patientCensus }));
                  setIsMorningCensusReadOnly(true);
                  setIsCensusAutoCalculated(true);
                }
              } else {
                if (!toastShownRef.current.night) { // Use night flag for this message
                  showInfoToast('ไม่พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน กรุณากรอกข้อมูล');
                  toastShownRef.current.night = true;
                }
                setIsMorningCensusReadOnly(false);
              }
          }

          // Fetch Existing Form Data for the selected shift
          const existingForm = await getWardForm(dateTimestamp, selectedShift, selectedWard);

          if (existingForm) {
            console.log('[useWardFormData] Existing form found:', existingForm); // Log fetched data
            // const currentShiftExpectedStatus = selectedShift === ShiftType.MORNING ? morningShiftStatus : nightShiftStatus;

            // Always load the data if an existing form is found, regardless of its status matching the 'expected' status.
            // The form read-only state will be determined by the actual status of the loaded form.
            // if (existingForm.isDraft || existingForm.status === currentShiftExpectedStatus) { 
               const loadedData = {
                  ...existingForm,
                  // Convert Timestamp to yyyy-MM-dd string for the input field
                  date: existingForm.date instanceof Timestamp ? format(existingForm.date.toDate(), 'yyyy-MM-dd') : existingForm.date,
                  patientCensus: Number(existingForm.patientCensus ?? 0),
                  nurseManager: Number(existingForm.nurseManager ?? 0),
                  rn: Number(existingForm.rn ?? 0),
                  pn: Number(existingForm.pn ?? 0),
                  wc: Number(existingForm.wc ?? 0),
                  newAdmit: Number(existingForm.newAdmit ?? 0),
                  transferIn: Number(existingForm.transferIn ?? 0),
                  referIn: Number(existingForm.referIn ?? 0),
                  transferOut: Number(existingForm.transferOut ?? 0),
                  referOut: Number(existingForm.referOut ?? 0),
                  discharge: Number(existingForm.discharge ?? 0),
                  dead: Number(existingForm.dead ?? 0),
                  available: Number(existingForm.available ?? 0),
                  unavailable: Number(existingForm.unavailable ?? 0),
                  plannedDischarge: Number(existingForm.plannedDischarge ?? 0),
               };
               setFormData(loadedData);
               console.log('[useWardFormData] Set formData state:', loadedData); // Log state after setting
               if (!toastShownRef.current.load) {
                 showInfoToast(`โหลดข้อมูล${existingForm.isDraft ? 'ร่าง' : 'ที่บันทึกสมบูรณ์'}สำหรับกะ${selectedShift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}แล้ว`);
                 toastShownRef.current.load = true;
               }
               setIsFormReadOnly(existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED);
               if (selectedShift === ShiftType.MORNING && isMorningCensusReadOnly) {
                  setIsCensusAutoCalculated(true);
               }
               if (existingForm?.status === FormStatus.DRAFT) {
                   setIsDraftLoaded(true);
                   showInfoToast("ข้อมูลร่างสำหรับกะนี้ถูกโหลดแล้ว");
               }
            // } else {
            //    // If existing form doesn't match expected status (e.g., loading FINAL but expected DRAFT)
            //    // Still apply the previous night census if applicable
            //    console.log(`[useWardFormData] Existing form status (${existingForm.status}) does not match expected status (${currentShiftExpectedStatus}). Applying previous night census if applicable.`);
            //    if (selectedShift === ShiftType.MORNING && previousNightForm && previousNightForm.patientCensus !== undefined) {
            //      setFormData(prev => ({ 
            //        ...initialFormData, 
            //        patientCensus: previousNightForm.patientCensus // Use patientCensus
            //      }));
            //      setIsMorningCensusReadOnly(true);
            //      setIsCensusAutoCalculated(true);
            //    } else {
            //      setFormData(initialFormData);
            //      setIsMorningCensusReadOnly(false);
            //    }
            //    // Decide if the form should be read-only based on the *found* status, even if not loaded
            //    setIsFormReadOnly(existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED);
            // }
          } else {
             console.log('No existing form found for this shift.');
             // If no existing form, apply previous night census if applicable (check patientCensus)
             if (selectedShift === ShiftType.MORNING && previousNightForm && previousNightForm.patientCensus !== undefined) {
               // Only set if the previous night form was approved
               if(previousNightForm.status === FormStatus.APPROVED) {
                 setFormData(prev => ({
                   ...initialFormData,
                   patientCensus: previousNightForm.patientCensus
                 }));
                 setIsMorningCensusReadOnly(true);
                 setIsCensusAutoCalculated(true);
               } else {
                  // Not approved, set to initial, keep editable
                  setFormData(initialFormData);
                  setIsMorningCensusReadOnly(false);
                  setIsCensusAutoCalculated(false);
                  // Toast already shown above
               }
             } else {
               setFormData(initialFormData);
               setIsMorningCensusReadOnly(false);
             }
             setIsFormReadOnly(false);
          }

          const latestDraft = await getLatestDraftForm(selectedWard, user); 
          setExistingDraftData(latestDraft);

        } catch (error) {
          console.error("Error loading existing form data:", error);
          if (!toastShownRef.current.error) {
            showErrorToast('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            toastShownRef.current.error = true;
          }
          setFormData(initialFormData);
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

  }, [selectedWard, selectedDate, selectedShift, user]); // Dependencies are stable inputs

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) { // Clear general error on change
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