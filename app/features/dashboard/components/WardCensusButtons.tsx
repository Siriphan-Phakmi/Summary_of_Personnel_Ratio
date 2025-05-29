'use client';

import React from 'react';
import { Ward } from '@/app/core/types/ward';

interface WardCensusButtonsProps {
  wards: Ward[];
  wardCensusMap: Map<string, number>;
  selectedWardId: string | null;
  onWardSelect: (wardId: string) => void;
  onActionSelect: (action: string) => void;
  isRegularUser?: boolean;
}

const WardCensusButtons: React.FC<WardCensusButtonsProps> = ({
  wards,
  wardCensusMap,
  selectedWardId,
  onWardSelect,
  onActionSelect,
  isRegularUser = false
}) => {
  // แสดงทุกแผนก (รวม Ward6)
  const displayedWards = wards;
  
  // เพิ่มปุ่มแสดงทุกแผนกสำหรับแอดมิน
  const showAllDepartmentsButton = !isRegularUser;
  
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {/* ปุ่มแสดงทุกแผนกสำหรับแอดมิน */}
        {showAllDepartmentsButton && (
          <button
            onClick={() => onWardSelect("")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors 
              ${!selectedWardId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            ทุกแผนก
          </button>
        )}
        
        {/* แสดงปุ่มเลือก Ward เฉพาะเมื่อไม่ใช่ผู้ใช้ทั่วไป หรือมี Ward มากกว่า 1 Ward */}
        {(!isRegularUser || displayedWards.length > 1) && displayedWards.map((ward) => (
          <button
            key={ward.id}
            onClick={() => ward.id && onWardSelect(ward.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors 
              ${selectedWardId === ward.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {ward.wardName} {" "}
            <span className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
              {wardCensusMap.get(ward.id?.toUpperCase() || '') || 0}
            </span>
          </button>
        ))}
        
        {/* แสดงปุ่มเลือกการดำเนินการเฉพาะเมื่อไม่ใช่ผู้ใช้ทั่วไป หรือมีการเลือก Ward แล้ว */}
        {(!isRegularUser || selectedWardId) && (
          <>
            <button
              onClick={() => onActionSelect('comparison')}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-800/40 transition-colors"
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                เปรียบเทียบเวรเช้า-ดึก
              </span>
            </button>
            
            <button
              onClick={() => onActionSelect('trend')}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-800/40 transition-colors"
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                แนวโน้มผู้ป่วย
              </span>
            </button>
            
            {!isRegularUser && ( // แสดงปุ่มรีเฟรชเฉพาะกับ Admin
              <button
                onClick={() => onActionSelect('refresh')}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-800/40 transition-colors"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  รีเฟรชข้อมูล
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WardCensusButtons; 