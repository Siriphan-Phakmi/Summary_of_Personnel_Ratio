'use client';

import React from 'react';
import { ShiftComparisonPanelProps } from './types/componentInterfaces';
import NoDataMessage from './NoDataMessage';
import StatCard from './ui/StatCard';

const ShiftComparisonPanel: React.FC<ShiftComparisonPanelProps> = ({
  selectedWardId,
  selectedDate,
  wards,
  loading,
  onWardChange,
  patientData,
}) => {

  const selectedWard = wards.find(w => w.id === selectedWardId);
  const dataForDate = patientData.find(d => d.date === selectedDate && d.wardId === selectedWardId);

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          เปรียบเทียบจำนวนผู้ป่วยเวรเช้า-ดึก
        </h2>
        <div className="mt-2 md:mt-0 flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">เลือกแผนก:</span>
          <select
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            onChange={(e) => onWardChange(e.target.value)}
            value={selectedWardId || ''}
          >
            <option value="">-- เลือกแผนก --</option>
            {wards.map(ward => (
              <option key={ward.id} value={ward.id || ''}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : selectedWardId && dataForDate ? (
        <div>
          <h3 className="text-lg font-semibold text-center text-gray-700 dark:text-gray-200 mb-4">
            ข้อมูลสำหรับวันที่ {selectedDate} - แผนก {selectedWard?.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="เวรเช้า" value={dataForDate.morningPatientCount} color="blue" />
            <StatCard title="เวรดึก" value={dataForDate.nightPatientCount} color="purple" />
          </div>
           <div className="mt-4 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  รวม: <span className="font-bold text-xl">{dataForDate.totalPatientCount}</span> คน
                </p>
            </div>
        </div>
      ) : (
         <div className="h-48">
            <NoDataMessage 
                message={selectedWardId ? "ไม่พบข้อมูลสำหรับวันที่เลือก" : "กรุณาเลือกแผนกเพื่อดูข้อมูล"}
                subMessage={selectedWardId ? "กรุณาเลือกวันที่อื่น หรือตรวจสอบว่ามีการบันทึกข้อมูลสำหรับแผนกนี้หรือไม่" : "เลือกแผนกจากเมนูด้านบนเพื่อแสดงข้อมูลเปรียบเทียบ"}
                icon="compare"
            />
         </div>
      )}
    </div>
  );
};

export default ShiftComparisonPanel; 