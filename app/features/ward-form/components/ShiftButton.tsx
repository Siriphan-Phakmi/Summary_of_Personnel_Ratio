'use client';

import React from 'react';
import { ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { Button } from '@/app/components/ui/Button';
import useStatusStyles from '../hooks/useStatusStyles';
import { twMerge } from 'tailwind-merge';

interface ShiftButtonProps {
  shift: ShiftType;
  selectedShift: ShiftType;
  status: FormStatus | null;
  isDisabled: boolean;
  onSelectShift: (shift: ShiftType) => void;
}

const ShiftButton: React.FC<ShiftButtonProps> = ({
  shift,
  selectedShift,
  status,
  isDisabled,
  onSelectShift,
}) => {
  const { getStatusVariant, getStatusIcon, getStatusText, getStatusClass } = useStatusStyles();

  const isSelected = shift === selectedShift;
  const baseText = shift === ShiftType.MORNING ? 'เวรเช้า (Morning)' : 'เวรดึก (Night)';

  const shouldShowStatusText =
    status === FormStatus.FINAL ||
    status === FormStatus.APPROVED ||
    status === FormStatus.REJECTED;

  const statusText = getStatusText(status);

  let statusColorClass = '';
  if (status === FormStatus.FINAL) statusColorClass = 'text-yellow-400';
  else if (status === FormStatus.APPROVED) statusColorClass = 'text-green-400';
  else if (status === FormStatus.REJECTED) statusColorClass = 'text-red-400';
  
  const buttonText = shouldShowStatusText ? (
    <>
      {baseText}
      <span className={twMerge('font-bold ml-1', statusColorClass)}>({statusText})</span>
    </>
  ) : (
    baseText
  );

  const buttonClasses = twMerge(
    'w-full flex-1 text-lg py-3 items-center justify-center transition-all duration-200',
    getStatusClass(status),
    isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'
  );

  return (
    <Button
      variant={getStatusVariant(status, isSelected)}
      onClick={() => !isDisabled && onSelectShift(shift)}
      disabled={isDisabled}
      className={buttonClasses}
    >
      <div className="flex items-center justify-center space-x-2">
        {getStatusIcon(status)}
        <span>{buttonText}</span>
      </div>
    </Button>
  );
};

export default ShiftButton; 