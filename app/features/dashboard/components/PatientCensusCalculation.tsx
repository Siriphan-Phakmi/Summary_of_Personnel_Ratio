'use client';

import React from 'react';
import { PatientCensusCalculationProps } from './types';

const PatientCensusCalculation: React.FC<PatientCensusCalculationProps> = ({ 
  formData, 
  shiftTitle,
  showRefresh = false,
  onRefresh = () => {}
}) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800 shadow-sm h-full">
      <div className="flex justify-between items-center mb-2 flex-wrap">
        <h3 className="font-medium text-blue-700 dark:text-blue-300 text-sm sm:text-base">การคำนวณ Patient Census ({shiftTitle})</h3>
        {showRefresh && (
          <button 
            onClick={onRefresh}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="รีเฟรชการคำนวณ"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">รับเข้า/ย้ายเข้า/ส่งต่อเข้า (+):</span>
          <span className="font-medium text-green-600 dark:text-green-400">+{formData.admitTotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">ย้ายออก/ส่งต่อออก/จำหน่าย/เสียชีวิต (-):</span>
          <span className="font-medium text-red-600 dark:text-red-400">-{formData.dischargeTotal}</span>
        </div>
        <div className="h-px bg-blue-200 dark:bg-blue-700 my-2"></div>
        <div className="flex justify-between font-bold">
          <span>ผลต่าง:</span>
          <span>{formData.calculatedCensus}</span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
          สูตร: รับเข้า - จำหน่าย = ผลต่าง
        </div>
      </div>
    </div>
  );
};

export default PatientCensusCalculation; 