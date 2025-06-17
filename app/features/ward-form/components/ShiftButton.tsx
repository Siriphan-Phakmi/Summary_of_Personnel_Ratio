'use client';

import React from 'react';
import { ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { Button } from '@/app/components/ui/Button';
import useStatusStyles from '../hooks/useStatusStyles';

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

  // ฟังก์ชันสร้างข้อความสำหรับปุ่มตามประเภทของเวรและสถานะ
  const getShiftButtonText = (): React.ReactNode => {
    const baseText = shift === ShiftType.MORNING ? 'เวรเช้า (Morning)' : 'เวรดึก (Night)';

    // แสดงสถานะเฉพาะกรณี FINAL, APPROVED, REJECTED
    if (
      status === FormStatus.FINAL ||
      status === FormStatus.APPROVED ||
      status === FormStatus.REJECTED
    ) {
      const statusText = getStatusText(status);
      // กำหนดคลาสเน้นข้อความตามสถานะ
      let statusClass = '';
      if (status === FormStatus.FINAL) {
        statusClass = 'font-bold text-yellow-400 ml-1';
      } else if (status === FormStatus.APPROVED) {
        statusClass = 'font-bold text-green-400 ml-1';
      } else if (status === FormStatus.REJECTED) {
        statusClass = 'font-bold text-red-400 ml-1';
      }

      // คืนค่าเป็น JSX พร้อมข้อความสถานะ
      return (
        <>
          {baseText}
          <span className={statusClass}>({statusText})</span>
        </>
      );
    }

    // กรณีอื่นๆ แสดงเฉพาะชื่อเวร
    return baseText;
  };

  // ฟังก์ชันรวมคลาสพื้นฐานกับคลาสสถานะ
  const getShiftButtonClass = (): string => {
    const baseClasses = 'w-full flex-1 text-lg py-3 items-center justify-center transition-all duration-200';
    const statusClass = getStatusClass(status);
    return `${baseClasses} ${statusClass} ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'}`;
  };

  return (
    <Button
      variant={getShiftButtonVariant()}
      onClick={() => !isDisabled && onSelectShift(shift)}
      disabled={isDisabled}
      className={getShiftButtonClass()}
    >
      <div className="flex items-center justify-center space-x-2">
        {getShiftStatusIcon()}
        <span>{getShiftButtonText()}</span>
      </div>
    </Button>
  );
};

export default ShiftButton; 