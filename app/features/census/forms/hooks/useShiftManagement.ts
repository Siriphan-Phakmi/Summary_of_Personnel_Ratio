'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShiftType, FormStatus } from '@/app/core/types/ward';
import { checkMorningShiftFormStatus, getWardForm } from '../services/wardFormService';
import { Timestamp } from 'firebase/firestore';

interface UseShiftManagementProps {
  selectedWard: string;
  selectedDate: string;
}

export const useShiftManagement = ({
  selectedWard,
  selectedDate,
}: UseShiftManagementProps) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>(ShiftType.MORNING);
  const [morningShiftStatus, setMorningShiftStatus] = useState<FormStatus | null>(null);
  const [nightShiftStatus, setNightShiftStatus] = useState<FormStatus | null>(null);
  const [isMorningShiftDisabled, setIsMorningShiftDisabled] = useState(false);
  const [isNightShiftDisabled, setIsNightShiftDisabled] = useState(true); // Night shift initially disabled
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const checkShiftStatuses = useCallback(async () => {
    if (!selectedWard || !selectedDate) return;

    setIsLoadingStatus(true);
    try {
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dateTimestamp = Timestamp.fromDate(targetDate);

      // Check Morning Shift Status
      const morningStatusCheck = await checkMorningShiftFormStatus(targetDate, selectedWard);
      const currentMorningStatus = morningStatusCheck.status ?? null;
      setMorningShiftStatus(currentMorningStatus);
      const isMorningFinalOrApproved = currentMorningStatus === FormStatus.FINAL || currentMorningStatus === FormStatus.APPROVED;
      
      // Check Night Shift Status (only needed if morning is final/approved)
      let currentNightStatus: FormStatus | null = null;
      if(isMorningFinalOrApproved) {
          const nightForm = await getWardForm(dateTimestamp, ShiftType.NIGHT, selectedWard);
          currentNightStatus = nightForm?.status ?? null; // If night form exists, get its status
      }
      setNightShiftStatus(currentNightStatus);
      const isNightFinalOrApproved = currentNightStatus === FormStatus.FINAL || currentNightStatus === FormStatus.APPROVED;

      // Determine button disabled states
      setIsMorningShiftDisabled(isMorningFinalOrApproved); // Disable morning if it's done
      setIsNightShiftDisabled(!isMorningFinalOrApproved || isNightFinalOrApproved); // Disable night if morning isn't done OR if night itself is done

      // Auto-select night shift if morning is done and night isn't
      if (isMorningFinalOrApproved && !isNightFinalOrApproved && selectedShift === ShiftType.MORNING) {
         setSelectedShift(ShiftType.NIGHT);
      }
      // Auto-select morning shift if neither is done (e.g., date changed back)
      else if (!isMorningFinalOrApproved && selectedShift === ShiftType.NIGHT) {
          setSelectedShift(ShiftType.MORNING);
      }

    } catch (error) {
      console.error("Error checking shift statuses:", error);
      // Reset statuses on error?
      setMorningShiftStatus(null);
      setNightShiftStatus(null);
      setIsMorningShiftDisabled(false);
      setIsNightShiftDisabled(true);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [selectedWard, selectedDate, selectedShift]); // Add selectedShift to dependencies to handle auto-selection logic

  useEffect(() => {
    checkShiftStatuses();
  }, [checkShiftStatuses]); // Run whenever dependencies of checkShiftStatuses change

  // Function to handle manual shift selection by user
  const handleSelectShift = (shift: ShiftType) => {
      // Prevent selecting a disabled shift
      if ((shift === ShiftType.MORNING && isMorningShiftDisabled) || 
          (shift === ShiftType.NIGHT && isNightShiftDisabled)) {
          console.warn(`Attempted to select disabled shift: ${shift}`);
          return;
      }
      setSelectedShift(shift);
  };

  return {
    selectedShift,
    morningShiftStatus,
    nightShiftStatus,
    isMorningShiftDisabled,
    isNightShiftDisabled,
    isLoadingStatus,
    handleSelectShift, // Expose the handler for the button component
    checkShiftStatuses, // Expose check function for manual refresh if needed
    setMorningShiftStatus,
    setNightShiftStatus,
    setIsMorningShiftDisabled,
    setIsNightShiftDisabled,
  };
}; 