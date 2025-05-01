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
  isFormFinalReadOnly?: boolean;   // NEW: เพิ่ม prop รับสถานะ readonly จาก form เมื่อ Save Final
}

const ShiftSelection: React.FC<ShiftSelectionProps> = ({
  selectedShift,
  onSelectShift,
  morningShiftStatus,
  nightShiftStatus,
  isMorningShiftDisabled,
  isNightShiftDisabled,
  isFormFinalReadOnly = false,  // NEW: กำหนดค่าเริ่มต้นเป็น false
}) => {
  // Combine passed disabled props with status-based disabling logic
  const morningDisabled = 
    isMorningShiftDisabled || 
    isFormFinalReadOnly ||       // NEW: ปิดปุ่ม morning เมื่อ form เป็น readonly
    morningShiftStatus === FormStatus.FINAL || 
    morningShiftStatus === FormStatus.APPROVED;
    
  // Night shift should also respect form read-only state
  const nightDisabled = 
    isNightShiftDisabled || 
    isFormFinalReadOnly;         // NEW: ปิดปุ่ม night เมื่อ form เป็น readonly

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