'use client';

import React from 'react';
import { ShiftType, FormStatus } from '@/app/core/types/ward';
import ShiftButton from './ShiftButton';

interface ShiftSelectionProps {
  selectedShift: ShiftType;
  onSelectShift: (shift: ShiftType) => void;
  morningShiftStatus: FormStatus | null; // Status of the morning shift form
  nightShiftStatus: FormStatus | null;   // Status of the night shift form
  isMorningShiftDisabled: boolean; // Disable morning button (e.g., after morning final save)
  isNightShiftDisabled: boolean;   // Disable night button (e.g., if morning not approved)
}

const ShiftSelection: React.FC<ShiftSelectionProps> = ({
  selectedShift,
  onSelectShift,
  morningShiftStatus,
  nightShiftStatus,
  isMorningShiftDisabled,
  isNightShiftDisabled,
}) => {
  // Combine passed disabled props with status-based disabling logic
  const morningDisabled = isMorningShiftDisabled || morningShiftStatus === FormStatus.FINAL || morningShiftStatus === FormStatus.APPROVED;
  const nightDisabled = isNightShiftDisabled; // Keep existing logic, might need adjustment based on approval flow

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <ShiftButton
        shift={ShiftType.MORNING}
        selectedShift={selectedShift}
        status={morningShiftStatus}
        isDisabled={morningDisabled}
        onSelectShift={onSelectShift}
      />
      <ShiftButton
        shift={ShiftType.NIGHT}
        selectedShift={selectedShift}
        status={nightShiftStatus}
        isDisabled={nightDisabled}
        onSelectShift={onSelectShift}
      />
    </div>
  );
};

export default ShiftSelection; 