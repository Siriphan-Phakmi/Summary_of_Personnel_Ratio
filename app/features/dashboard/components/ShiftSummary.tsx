'use client';

import React from 'react';
import { ShiftSummaryProps } from './types';

const ShiftSummary: React.FC<ShiftSummaryProps> = ({
  title,
  patientCensus,
  nurseManager,
  rn,
  pn,
  wc,
  newAdmit,
  transferIn,
  referIn,
  discharge,
  transferOut,
  referOut,
  dead,
  admitTotal,
  dischargeTotal
}) => {
  // คำนวณค่ารวมถ้าไม่ได้รับมา
  const calculatedAdmitTotal = admitTotal || (newAdmit + transferIn + referIn);
  const calculatedDischargeTotal = dischargeTotal || (discharge + transferOut + referOut + dead);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-lg">{title}</h3>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Patient Census</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{patientCensus}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400 text-sm">รับเข้าทั้งหมด</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{calculatedAdmitTotal}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400 text-sm">พยาบาลทั้งหมด</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{nurseManager + rn + pn + wc}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400 text-sm">จำหน่ายทั้งหมด</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{calculatedDischargeTotal}</div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-medium mb-3">รายละเอียดเพิ่มเติม</h4>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Nurse Manager:</span>
              <span>{nurseManager}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">RN:</span>
              <span>{rn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">PN:</span>
              <span>{pn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">WC:</span>
              <span>{wc}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">New Admit:</span>
              <span>{newAdmit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Transfer In:</span>
              <span>{transferIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Refer In:</span>
              <span>{referIn}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Discharge:</span>
              <span>{discharge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Transfer Out:</span>
              <span>{transferOut}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Refer Out:</span>
              <span>{referOut}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Dead:</span>
              <span>{dead}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftSummary; 