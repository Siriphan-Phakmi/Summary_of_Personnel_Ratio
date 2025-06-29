'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { WardSummaryDashboardProps } from '../types/componentInterfaces';
import ShiftSummary from '../ShiftSummary';
import PatientCensusCalculation from '../PatientCensusCalculation';
import { adaptArrayToOldWardSummaryFormat } from '../../utils/dataAdapters';

const WardSummaryDashboard: React.FC<WardSummaryDashboardProps> = ({
  summaryData,
  loading,
  selectedDate
}) => {
  // เนื่องจาก component นี้ตอนนี้แสดงข้อมูลของทุก ward ที่อยู่ใน summaryData
  // จึงไม่จำเป็นต้องมี selectedWardId หรือ onSelectWard อีกต่อไป
  
  // แปลงข้อมูลทั้งหมดเป็นรูปแบบเดิม
  const oldFormatData = adaptArrayToOldWardSummaryFormat(summaryData);
  
  return (
    <div className="space-y-6">
      {loading && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <div className="animate-pulse flex justify-center">
            <div className="h-8 w-8 bg-blue-400 rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      )}
      
      {!loading && oldFormatData && oldFormatData.length > 0 && (
        oldFormatData.map(summary => (
          <div key={(summary as any).wardId || `ward-${Math.random()}`} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">
              <span className="block sm:inline">{summary.wardName}</span> <span className="block sm:inline">- วันที่ {selectedDate ? format(parseISO(selectedDate), 'dd/MM/yyyy') : ''}</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center mb-6">
            <div>
              <p className="text-base sm:text-lg font-medium">รวม (ทั้งวัน):</p>
              <p className="text-2xl sm:text-3xl font-bold">
                  {summary.nightShift?.patientCensus ?? summary.morningShift?.patientCensus ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-base sm:text-lg font-medium">กะเช้า:</p>
              <p className="text-2xl sm:text-3xl font-bold">
                  {summary.morningShift?.patientCensus ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-base sm:text-lg font-medium">กะดึก:</p>
              <p className="text-2xl sm:text-3xl font-bold">
                  {summary.nightShift?.patientCensus ?? 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 gap-y-6 mb-6">
            {/* กะเช้า */}
            <ShiftSummary
              title="กะเช้า"
              data={summary.morningShift}
            />
            
            {/* กะดึก */}
            <ShiftSummary
              title="กะดึก"
              data={summary.nightShift}
            />
          </div>
        </div>
        ))
      )}
      
      {!loading && (!oldFormatData || oldFormatData.length === 0) && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">ไม่พบข้อมูลสรุปในวันที่เลือก</p>
        </div>
      )}
    </div>
  );
};

export default WardSummaryDashboard; 