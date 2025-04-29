'use client';

import React from 'react';
import { ShiftType, FormStatus } from '@/app/core/types/ward';
import Button from '@/app/core/ui/Button';
import useStatusStyles from '../hooks/useStatusStyles';
import '../styles/index.css'; // Import main CSS file

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
  // ใช้ custom hook เพื่อดึงฟังก์ชั่นจัดการสไตล์ตามสถานะ
  const { 
    getStatusVariant, 
    getStatusIcon, 
    getStatusText, 
    getStatusClass 
  } = useStatusStyles();

  // ฟังก์ชันดึง variant ของปุ่มตามสถานะและการเลือก
  const getShiftButtonVariant = (): 'primary' | 'secondary' | 'outline' | 'destructive' => {
    return getStatusVariant(status, shift === selectedShift);
  };

  // ฟังก์ชันดึงไอคอนตามสถานะ
  const getShiftStatusIcon = (): React.ReactNode | null => {
    return getStatusIcon(status);
  };

  // ฟังก์ชันสร้างข้อความสำหรับปุ่มตามประเภทของกะและสถานะ
  const getShiftButtonText = (): string => {
    const baseText = shift === ShiftType.MORNING ? 'กะเช้า (Morning)' : 'กะดึก (Night)';
    if (status) {
      return `${baseText} (${getStatusText(status)})`;
    }
    return baseText;
  };

  // ฟังก์ชันรวมคลาสพื้นฐานกับคลาสสถานะ
  const getShiftButtonClass = (): string => {
    const baseClasses = 'flex-1 text-lg py-3 items-center justify-center';
    const statusClass = getStatusClass(status);
    return `${baseClasses} ${statusClass}`;
  };

  return (
    <Button
      variant={getShiftButtonVariant()}
      onClick={() => !isDisabled && onSelectShift(shift)}
      disabled={isDisabled}
      className={getShiftButtonClass()}
      fullWidth
    >
      {getShiftStatusIcon()}
      {getShiftButtonText()}
    </Button>
  );
};

export default ShiftButton; 