'use client';

import React from 'react';
import { ShiftType, FormStatus } from '@/app/core/types/ward';
import Button from '@/app/core/ui/Button'; // Assuming Button component exists
import { FiEdit2, FiCheckCircle } from 'react-icons/fi'; // Import icons

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

  const getButtonVariant = (shift: ShiftType): 'primary' | 'secondary' | 'outline' => {
    const status = shift === ShiftType.MORNING ? morningShiftStatus : nightShiftStatus;
    
    if (selectedShift === shift) {
      return 'primary'; // Currently selected shift
    }
    
    if (status === FormStatus.FINAL || status === FormStatus.APPROVED) {
      return 'secondary'; // Saved as final/approved (but not selected)
    }
    
    if (status === FormStatus.DRAFT) {
      return 'outline'; // Saved as draft (but not selected)
    }

    return 'secondary'; // Default / Not saved yet (and not selected)
  };

  // Function to get status icon based on shift status
  const getStatusIcon = (shift: ShiftType): React.ReactNode | null => {
    const status = shift === ShiftType.MORNING ? morningShiftStatus : nightShiftStatus;
    if (status === FormStatus.DRAFT) {
      return <FiEdit2 className="mr-2 h-4 w-4" aria-label="สถานะร่าง" />;
    }
    if (status === FormStatus.FINAL || status === FormStatus.APPROVED) {
      return <FiCheckCircle className="mr-2 h-4 w-4 text-green-500" aria-label="สถานะบันทึกสมบูรณ์" />;
    }
    return null;
  };

  const getButtonText = (shift: ShiftType): string => {
    const status = shift === ShiftType.MORNING ? morningShiftStatus : nightShiftStatus;
    const baseText = shift === ShiftType.MORNING ? 'กะเช้า (Morning)' : 'กะดึก (Night)';

    if (status === FormStatus.FINAL || status === FormStatus.APPROVED) {
      return `${baseText} (บันทึกสมบูรณ์)`;
    }
    if (status === FormStatus.DRAFT) {
      return `${baseText} (ร่าง)`;
    }
    return baseText;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Button
        variant={getButtonVariant(ShiftType.MORNING)}
        onClick={() => onSelectShift(ShiftType.MORNING)}
        disabled={isMorningShiftDisabled}
        className="flex-1 text-lg py-3 items-center justify-center" // Ensure items are centered
        fullWidth
      >
        {getStatusIcon(ShiftType.MORNING)} {/* Add icon */}
        {getButtonText(ShiftType.MORNING)}
      </Button>
      <Button
        variant={getButtonVariant(ShiftType.NIGHT)}
        onClick={() => onSelectShift(ShiftType.NIGHT)}
        disabled={isNightShiftDisabled}
        className="flex-1 text-lg py-3 items-center justify-center" // Ensure items are centered
        fullWidth
      >
        {getStatusIcon(ShiftType.NIGHT)} {/* Add icon */}
        {getButtonText(ShiftType.NIGHT)}
      </Button>
    </div>
  );
};

export default ShiftSelection; 