'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShiftType, FormStatus } from '@/app/core/types/ward';
// import { checkMorningShiftFormStatus, getWardForm } from '../services/wardFormService'; // <<< REMOVE Import service functions
// import { Timestamp } from 'firebase/firestore'; // <<< REMOVE Timestamp if not needed elsewhere

interface UseShiftManagementProps {
  // selectedWard: string; // <<< REMOVE - No longer needed for fetching here
  // selectedDate: string; // <<< REMOVE - No longer needed for fetching here
  initialShift?: ShiftType; // Optional initial shift
  morningStatus: FormStatus | null; // <<< ADD Prop for morning status
  nightStatus: FormStatus | null; // <<< ADD Prop for night status
}

export const useShiftManagement = ({
  // selectedWard, // <<< REMOVE
  // selectedDate, // <<< REMOVE
  initialShift = ShiftType.MORNING, // Default to morning if not provided
  morningStatus, // <<< RECEIVE Prop
  nightStatus, // <<< RECEIVE Prop
}: UseShiftManagementProps) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>(initialShift);
  // Remove state management for statuses, as they are now props
  // const [morningShiftStatus, setMorningShiftStatus] = useState<FormStatus | null>(null); 
  // const [nightShiftStatus, setNightShiftStatus] = useState<FormStatus | null>(null);
  const [isMorningShiftDisabled, setIsMorningShiftDisabled] = useState(false);
  const [isNightShiftDisabled, setIsNightShiftDisabled] = useState(true); // Night shift initially disabled?
  const [isLoadingStatus, setIsLoadingStatus] = useState(false); // Keep loading state? Maybe remove if status loading is handled outside

  // <<< REMOVE Effect 1: Fetch shift statuses - This is now handled outside >>>
  /*
  useEffect(() => {
    // ... removed fetchStatuses logic ...
  }, [selectedWard, selectedDate]);
  */

  // Effect: Determine disabled states based on props
  useEffect(() => {
    const isMorningFinalOrApproved = morningStatus === FormStatus.FINAL || morningStatus === FormStatus.APPROVED;
    const isNightFinalOrApproved = nightStatus === FormStatus.FINAL || nightStatus === FormStatus.APPROVED;

    setIsMorningShiftDisabled(isMorningFinalOrApproved);
    // Disable night shift if morning isn't done, OR if night itself is done.
    setIsNightShiftDisabled(!isMorningFinalOrApproved || isNightFinalOrApproved); 

  }, [morningStatus, nightStatus]); // React to changes in status props

  // Effect: Handle auto-selection based on status props
  useEffect(() => {
    // Use props directly
    const isMorningDone = morningStatus === FormStatus.FINAL || morningStatus === FormStatus.APPROVED;
    const isNightDone = nightStatus === FormStatus.FINAL || nightStatus === FormStatus.APPROVED;

    let targetShift = selectedShift; // Start with current shift

    // Determine the target shift based *only* on statuses
    if (isMorningDone && !isNightDone) {
      targetShift = ShiftType.NIGHT;
      // console.log("[ShiftMgmt AutoSelect] Target determined: Night");
    } else if (!isMorningDone) {
      targetShift = ShiftType.MORNING;
      // console.log("[ShiftMgmt AutoSelect] Target determined: Morning");
    }
    // If both done, or morning not done, targetShift logic handles it.
    // else {
      // console.log("[ShiftMgmt AutoSelect] Target determined: Stick to current (", selectedShift, ")");
    // }

    // Only call setSelectedShift if the target is different from the current state
    if (targetShift !== selectedShift) {
      console.log(`[ShiftMgmt AutoSelect] Current: ${selectedShift}, Target: ${targetShift}. Updating state.`);
      setSelectedShift(targetShift);
    } 
    
  }, [morningStatus, nightStatus, selectedShift]); // Depend on status props and current shift

  // Function to handle manual shift selection by user
  const handleSelectShift = useCallback((shift: ShiftType) => {
      // Check disabled state based on current state variables
      if ((shift === ShiftType.MORNING && isMorningShiftDisabled) || 
          (shift === ShiftType.NIGHT && isNightShiftDisabled)) {
          console.warn(`Attempted to select disabled shift: ${shift}`);
          return;
      }
      setSelectedShift(shift);
  }, [isMorningShiftDisabled, isNightShiftDisabled]); // Dependencies for the check

  return {
    selectedShift,
    // Expose status props directly? Or maybe not needed if consumer already has them.
    // morningStatus, // Pass through if needed by consumer
    // nightStatus, // Pass through if needed by consumer
    isMorningShiftDisabled,
    isNightShiftDisabled,
    // isLoadingStatus, // Maybe remove, loading is handled elsewhere
    handleSelectShift, // Expose the handler for the button component
    // Remove setters for status, they are controlled by props now
    // setMorningShiftStatus,
    // setNightShiftStatus,
    // Remove setters for disabled? They are derived from props.
    // setIsMorningShiftDisabled,
    // setIsNightShiftDisabled,
  };
}; 