'use client';

import React from 'react';
import { ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import ShiftButton from './ShiftButton';

interface ShiftSelectionProps {
  selectedShift: ShiftType;
  onSelectShift: (shift: ShiftType) => void;
  morningShiftStatus: FormStatus | null; // Status of the morning shift form
  nightShiftStatus: FormStatus | null;   // Status of the night shift form
  isMorningShiftDisabled: boolean; // Disable morning button based on hook logic
  isNightShiftDisabled: boolean;   // Disable night button based on hook logic
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
  const morningDisabled =
    isMorningShiftDisabled ||
    morningShiftStatus === FormStatus.FINAL ||
    morningShiftStatus === FormStatus.APPROVED ||
    morningShiftStatus === FormStatus.REJECTED;
    
  // Night shift disabled until morning approved or when night is final/approved/rejected
  const nightDisabled =
    isNightShiftDisabled ||
    nightShiftStatus === FormStatus.FINAL ||
    nightShiftStatus === FormStatus.APPROVED ||
    nightShiftStatus === FormStatus.REJECTED;

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