'use client';

import React from 'react';
import { WardButtonProps } from './types/button-types';

/**
 * ปุ่มสำหรับเลือกแผนก แสดงจำนวนผู้ป่วยและชื่อแผนก
 */
const WardButton: React.FC<WardButtonProps> = ({ 
  wardName, 
  patientCount, 
  isSelected = false, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg transition-all duration-200 shadow-sm 
        flex flex-col items-center justify-center text-center
        ${isSelected 
          ? 'bg-blue-500 text-white shadow-md transform scale-105' 
          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700'}
      `}
    >
      <div className="font-semibold">{wardName}</div>
      <div className={`text-2xl font-bold mt-1 ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
        {patientCount}
      </div>
      <div className="text-xs mt-1 opacity-75">
        {isSelected ? 'คลิกเพื่อดูรายละเอียด' : 'คลิกเพื่อเลือก'}
      </div>
    </button>
  );
};

export default WardButton; 