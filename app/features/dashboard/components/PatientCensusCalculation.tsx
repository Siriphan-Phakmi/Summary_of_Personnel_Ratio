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
    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-blue-700 dark:text-blue-300">การคำนวณ Patient Census ({shiftTitle})</h3>
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
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">เริ่มต้น:</span>
          <span className="font-medium">{formData.initialCensus}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">รับเข้า (+):</span>
          <span className="font-medium text-green-600 dark:text-green-400">+{formData.admitTotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">จำหน่าย (-):</span>
          <span className="font-medium text-red-600 dark:text-red-400">-{formData.dischargeTotal}</span>
        </div>
        <div className="h-px bg-blue-200 dark:bg-blue-700 my-2"></div>
        <div className="flex justify-between font-bold">
          <span>คงเหลือ (คาดการณ์):</span>
          <span>{formData.calculatedCensus}</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          สูตร: เริ่มต้น + รับเข้า - จำหน่าย = คงเหลือ
        </div>
      </div>
    </div>
  );
};

export default PatientCensusCalculation; 