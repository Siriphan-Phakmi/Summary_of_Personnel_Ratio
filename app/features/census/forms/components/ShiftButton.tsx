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
  const getShiftButtonText = (): React.ReactNode => {
    const baseText = shift === ShiftType.MORNING ? 'กะเช้า (Morning)' : 'กะดึก (Night)';
    
    // Log สถานะเพื่อตรวจสอบ
    console.log(`[ShiftButton] shift=${shift}, status=${status}, isDisabled=${isDisabled}`);
    
    // เพิ่มข้อความสถานะในกรณีที่มีสถานะ - ดูค่าจาก getStatusText
    if (status) {
      // โดยเฉพาะกรณี FINAL ต้องแสดง "รออนุมัติ" อย่างชัดเจน
      const statusText = getStatusText(status);
      console.log(`[ShiftButton] statusText="${statusText}" for status=${status}`);
      
      // สร้าง span พิเศษสำหรับ status text โดยเฉพาะกรณี FINAL
      let statusClass = "";
      if (status === FormStatus.FINAL) {
        statusClass = "font-bold text-yellow-400 ml-1"; // เน้นให้เห็นชัดเจน
      } else if (status === FormStatus.APPROVED) {
        statusClass = "font-bold text-green-400 ml-1";
      } else if (status === FormStatus.REJECTED) {
        statusClass = "font-bold text-red-400 ml-1";
      } else {
        statusClass = "text-gray-300 ml-1";
      }
      
      // คืนค่าเป็น JSX
      return (
        <>
          {baseText} <span className={statusClass}>({statusText})</span>
        </>
      );
    }
    
    return baseText;
  };

  // ฟังก์ชันรวมคลาสพื้นฐานกับคลาสสถานะ
  const getShiftButtonClass = (): string => {
    const baseClasses = 'flex-1 text-lg py-3 items-center justify-center';
    const statusClass = getStatusClass(status);
    return `${baseClasses} ${statusClass} ${isDisabled ? 'opacity-70' : ''}`;
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