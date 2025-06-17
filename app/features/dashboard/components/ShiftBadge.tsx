'use client';

import React from 'react';
import { ShiftType } from '@/app/features/ward-form/types/ward';

interface ShiftBadgeProps {
  shift: ShiftType | string;
}

export const ShiftBadge: React.FC<ShiftBadgeProps> = ({ shift }) => {
  const baseClasses = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  if (shift === ShiftType.MORNING) {
    return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`}>เช้า</span>;
  } else if (shift === ShiftType.NIGHT) {
    return <span className={`${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400`}>ดึก</span>;
  }
  
  return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>{shift}</span>;
};

export default ShiftBadge; 