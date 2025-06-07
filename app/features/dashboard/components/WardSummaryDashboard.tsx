'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { WardSummaryDashboardProps } from './types/componentInterfaces';
import ShiftSummary from './ShiftSummary';
import PatientCensusCalculation from './PatientCensusCalculation';

const WardSummaryDashboard: React.FC<WardSummaryDashboardProps> = ({
  summaryData,
  loading,
  selectedDate
}) => {
  // เนื่องจาก component นี้ตอนนี้แสดงข้อมูลของทุก ward ที่อยู่ใน summaryData
  // จึงไม่จำเป็นต้องมี selectedWardId หรือ onSelectWard อีกต่อไป
  
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
      
      {!loading && summaryData && summaryData.length > 0 && (
        summaryData.map(summary => (
          <div key={summary.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
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
              {summary.morningShift && (
              <ShiftSummary
                title="กะเช้า"
                  patientCensus={summary.morningShift.patientCensus}
                  nurseManager={summary.morningShift.nurseManager}
                  rn={summary.morningShift.rn}
                  pn={summary.morningShift.pn}
                  wc={summary.morningShift.wc}
                  newAdmit={summary.morningShift.newAdmit}
                  transferIn={summary.morningShift.transferIn}
                  referIn={summary.morningShift.referIn}
                  discharge={summary.morningShift.discharge}
                  transferOut={summary.morningShift.transferOut}
                  referOut={summary.morningShift.referOut}
                  dead={summary.morningShift.dead}
                  admitTotal={(summary.morningShift.newAdmit || 0) + (summary.morningShift.transferIn || 0) + (summary.morningShift.referIn || 0)}
                  dischargeTotal={(summary.morningShift.discharge || 0) + (summary.morningShift.transferOut || 0) + (summary.morningShift.referOut || 0) + (summary.morningShift.dead || 0)}
              />
            )}
            
            {/* กะดึก */}
              {summary.nightShift && (
              <ShiftSummary
                title="กะดึก"
                  patientCensus={summary.nightShift.patientCensus}
                  nurseManager={summary.nightShift.nurseManager}
                  rn={summary.nightShift.rn}
                  pn={summary.nightShift.pn}
                  wc={summary.nightShift.wc}
                  newAdmit={summary.nightShift.newAdmit}
                  transferIn={summary.nightShift.transferIn}
                  referIn={summary.nightShift.referIn}
                  discharge={summary.nightShift.discharge}
                  transferOut={summary.nightShift.transferOut}
                  referOut={summary.nightShift.referOut}
                  dead={summary.nightShift.dead}
                  admitTotal={(summary.nightShift.newAdmit || 0) + (summary.nightShift.transferIn || 0) + (summary.nightShift.referIn || 0)}
                  dischargeTotal={(summary.nightShift.discharge || 0) + (summary.nightShift.transferOut || 0) + (summary.nightShift.referOut || 0) + (summary.nightShift.dead || 0)}
              />
            )}
          </div>
        </div>
        ))
      )}
      
      {!loading && (!summaryData || summaryData.length === 0) && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">ไม่พบข้อมูลสรุปในวันที่เลือก</p>
        </div>
      )}
    </div>
  );
};

export default WardSummaryDashboard; 