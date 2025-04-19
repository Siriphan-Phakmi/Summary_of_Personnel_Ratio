'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { getWardForm, getPreviousNightShiftForm, getLatestDraftForm } from '../services/wardFormService';
import { showInfoToast, showErrorToast } from '@/app/core/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';

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

  const loadExistingFormData = useCallback(async () => {
    if (!selectedWard || !selectedDate || !user) {
        // Reset form if essential parameters are missing
        setFormData(initialFormData);
        setIsMorningCensusReadOnly(false);
        setIsFormReadOnly(false);
        setExistingDraftData(null);
        return;
    }

    setIsLoading(true);
    setErrors({});
    // Do not reset shift statuses here, they come from props
    setIsMorningCensusReadOnly(false);
    setIsFormReadOnly(false);
    setFormData(initialFormData); // Reset form data first

    try {
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dateTimestamp = Timestamp.fromDate(targetDate);

      // Fetch Previous Night Shift Form Data (only needed for Morning Shift)
      let previousNightForm: WardForm | null = null;
      if (selectedShift === ShiftType.MORNING) {
          previousNightForm = await getPreviousNightShiftForm(targetDate, selectedWard);
          if (previousNightForm?.totalPatientCensus !== undefined) {
            showInfoToast('พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน');
            setFormData(prev => ({ ...prev, patientCensus: previousNightForm!.totalPatientCensus }));
            setIsMorningCensusReadOnly(true);
          } else {
            showInfoToast('ไม่พบข้อมูลคงพยาบาลจากกะดึกคืนก่อน กรุณากรอกข้อมูล');
            setIsMorningCensusReadOnly(false);
          }
      }

      // Fetch Existing Form Data for the selected shift
      const existingForm = await getWardForm(dateTimestamp, selectedShift, selectedWard);

      if (existingForm) {
        console.log('Existing form found:', existingForm);
        // Check if the loaded form matches the selected shift's expected status
        const currentShiftExpectedStatus = selectedShift === ShiftType.MORNING ? morningShiftStatus : nightShiftStatus;

        // Load data if it's a draft, or if final/approved and matches the expected status for the selected shift
        if (existingForm.isDraft || existingForm.status === currentShiftExpectedStatus) {
           setFormData({
              ...existingForm,
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
              date: existingForm.date,
           });
           showInfoToast(`โหลดข้อมูล${existingForm.isDraft ? 'ร่าง' : 'ที่บันทึกสมบูรณ์'}สำหรับกะ${selectedShift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}แล้ว`);
           setIsFormReadOnly(existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED);
        }
      } else {
        console.log('No existing form found for this shift.');
        if (selectedShift === ShiftType.MORNING && previousNightForm && previousNightForm.totalPatientCensus !== undefined) {
          setFormData(prev => ({ 
            ...initialFormData, 
            patientCensus: previousNightForm.totalPatientCensus 
          }));
          setIsMorningCensusReadOnly(true);
        } else {
          setFormData(initialFormData);
          setIsMorningCensusReadOnly(false);
        }
        setIsFormReadOnly(false);
      }

      // Fetch latest draft for confirmation modal logic (independent of selected shift)
      const latestDraft = await getLatestDraftForm(selectedWard, user);
      setExistingDraftData(latestDraft);

    } catch (error) {
      console.error("Error loading existing form data:", error);
      showErrorToast('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setFormData(initialFormData);
      setIsMorningCensusReadOnly(false);
      setIsFormReadOnly(false);
      setExistingDraftData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWard, selectedDate, selectedShift, user, morningShiftStatus, nightShiftStatus]); // Include shift statuses

  useEffect(() => {
    loadExistingFormData();
  }, [loadExistingFormData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
    existingDraftData,
    setExistingDraftData, // Add missing setter
    handleChange,
    loadExistingFormData, // Expose reload function if needed
  };
}; 