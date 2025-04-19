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

  // Effect 1: Fetch shift statuses when ward or date changes
  useEffect(() => {
    if (!selectedWard || !selectedDate) return;

    const fetchStatuses = async () => {
      setIsLoadingStatus(true);
      try {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        const dateTimestamp = Timestamp.fromDate(targetDate);

        // Check Morning Shift Status
        const morningStatusCheck = await checkMorningShiftFormStatus(targetDate, selectedWard);
        const currentMorningStatus = morningStatusCheck.status ?? null;
        setMorningShiftStatus(currentMorningStatus);
        const isMorningFinalOrApproved = currentMorningStatus === FormStatus.FINAL || currentMorningStatus === FormStatus.APPROVED;

        // Check Night Shift Status
        let currentNightStatus: FormStatus | null = null;
        if (isMorningFinalOrApproved) {
          const nightForm = await getWardForm(dateTimestamp, ShiftType.NIGHT, selectedWard);
          currentNightStatus = nightForm?.status ?? null;
        }
        setNightShiftStatus(currentNightStatus);
        const isNightFinalOrApproved = currentNightStatus === FormStatus.FINAL || currentNightStatus === FormStatus.APPROVED;

        // Determine button disabled states based *only* on fetched statuses
        setIsMorningShiftDisabled(isMorningFinalOrApproved);
        setIsNightShiftDisabled(!isMorningFinalOrApproved || isNightFinalOrApproved);

      } catch (error) {
        console.error("Error fetching shift statuses:", error);
        setMorningShiftStatus(null);
        setNightShiftStatus(null);
        setIsMorningShiftDisabled(false);
        setIsNightShiftDisabled(true);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchStatuses();
  }, [selectedWard, selectedDate]); // Only depends on ward and date

  // Effect 2: Handle auto-selection based on fetched statuses
  /*
  useEffect(() => {
    // Don't auto-select while loading statuses
    if (isLoadingStatus) return;

    const isMorningDone = morningShiftStatus === FormStatus.FINAL || morningShiftStatus === FormStatus.APPROVED;
    const isNightDone = nightShiftStatus === FormStatus.FINAL || nightShiftStatus === FormStatus.APPROVED;

    let targetShift = selectedShift; // Start with current shift

    // Determine the target shift based *only* on statuses
    if (isMorningDone && !isNightDone) {
      targetShift = ShiftType.NIGHT;
      console.log("[ShiftMgmt AutoSelect] Target determined: Night");
    } else if (!isMorningDone) {
      targetShift = ShiftType.MORNING;
      console.log("[ShiftMgmt AutoSelect] Target determined: Morning");
    }
    // If both done, targetShift implicitly remains the current selectedShift
    else {
      console.log("[ShiftMgmt AutoSelect] Target determined: Stick to current (", selectedShift, ")");
    }

    // Only call setSelectedShift if the target is different from the current state
    if (targetShift !== selectedShift) {
      console.log(`[ShiftMgmt AutoSelect] Current: ${selectedShift}, Target: ${targetShift}. Updating state.`);
      setSelectedShift(targetShift);
    } 
    // else {
      // console.log(`[ShiftMgmt AutoSelect] Current: ${selectedShift}, Target: ${targetShift}. No state update needed.`);
    // }

  // Remove selectedShift from dependencies here. React only to status changes.
  }, [morningShiftStatus, nightShiftStatus, isLoadingStatus]); 
  */

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
    setMorningShiftStatus,
    setNightShiftStatus,
    setIsMorningShiftDisabled,
    setIsNightShiftDisabled,
  };
}; 