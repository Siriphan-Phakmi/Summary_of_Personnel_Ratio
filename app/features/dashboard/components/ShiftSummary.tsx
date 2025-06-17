'use client';

import React from 'react';
import { WardFormSummary } from './types';
import { ShiftSummaryData } from './types/interface-types';

interface ShiftSummaryProps {
  title: string;
  data?: WardFormSummary | ShiftSummaryData;
}

const StatDisplay = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => (
  <div className={`p-3 rounded-lg ${colorClass}`}>
    <div className="text-gray-100 opacity-90 text-sm">{label}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string, value: number }) => (
  <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <span className="text-gray-500 dark:text-gray-400">{label}:</span>
    <span className="font-medium">{value}</span>
  </div>
);

const ShiftSummary: React.FC<ShiftSummaryProps> = ({ title, data }) => {
  if (!data) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-lg">{title}</h3>
        </div>
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 h-48 flex items-center justify-center">
          ไม่มีข้อมูลสำหรับกะนี้
        </div>
      </div>
    );
  }

  const admitTotal = data.admitted + data.transferredIn;
  const dischargeTotal = data.discharged + data.transferredOut + data.deaths;
  
  // ตรวจสอบว่า data มี availableBeds และ occupiedBeds หรือไม่
  const hasBedsData = 'availableBeds' in data && 'occupiedBeds' in data;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-lg">{title}</h3>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatDisplay label="คงพยาบาล" value={data.patientCensus} colorClass="bg-blue-500" />
          <StatDisplay label="รับเข้า" value={admitTotal} colorClass="bg-green-500" />
          <StatDisplay label="จำหน่าย" value={dischargeTotal} colorClass="bg-red-500" />
        </div>
        
        <div className="space-y-4">
            <div>
                <h4 className="font-medium text-base text-gray-600 dark:text-gray-300 mb-2">รายละเอียดการรับเข้า</h4>
                <div className="text-sm space-y-1">
                    <DetailRow label="Admitted" value={data.admitted} />
                    <DetailRow label="Transferred In" value={data.transferredIn} />
                </div>
            </div>
            <div>
                <h4 className="font-medium text-base text-gray-600 dark:text-gray-300 mb-2">รายละเอียดการจำหน่าย</h4>
                <div className="text-sm space-y-1">
                    <DetailRow label="Discharged" value={data.discharged} />
                    <DetailRow label="Transferred Out" value={data.transferredOut} />
                    <DetailRow label="Deaths" value={data.deaths} />
                </div>
            </div>
            {hasBedsData && (
              <div>
                  <h4 className="font-medium text-base text-gray-600 dark:text-gray-300 mb-2">ข้อมูลเตียง</h4>
                  <div className="text-sm space-y-1">
                      <DetailRow label="Available Beds" value={(data as WardFormSummary).availableBeds} />
                      <DetailRow label="Occupied Beds" value={(data as WardFormSummary).occupiedBeds} />
                  </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ShiftSummary; 