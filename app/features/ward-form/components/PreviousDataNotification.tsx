'use client';

import React from 'react';
import { FiInfo, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

interface PreviousDataNotificationProps {
  hasPreviousData: boolean;
  isLoading: boolean;
  selectedDate: string;
  wardName?: string;
  className?: string;
}

const PreviousDataNotification: React.FC<PreviousDataNotificationProps> = ({
  hasPreviousData,
  isLoading,
  selectedDate,
  wardName,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md ${className}`}>
        <div className="flex items-center">
          <FiInfo className="text-blue-500 mr-2 animate-pulse" />
          <span className="text-blue-700 text-sm">กำลังตรวจสอบข้อมูลย้อนหลัง...</span>
        </div>
      </div>
    );
  }

  const previousDateStr = new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000)
    .toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  if (hasPreviousData) {
    return (
      <div className={`bg-green-50 border-l-4 border-green-400 p-4 rounded-md ${className}`}>
        <div className="flex items-start">
          <FiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-green-700 text-sm">
            <div className="font-medium mb-1">พบข้อมูลกะดึกย้อนหลัง</div>
            <div className="text-green-600">
              มีข้อมูลกะดึกของวันที่ {previousDateStr} {wardName ? `ของ${wardName}` : ''} 
              <br />
              จำนวนผู้ป่วยคงเหลือจะถูกนำมาคำนวณอัตโนมัติ
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md ${className}`}>
      <div className="flex items-start">
        <FiAlertCircle className="text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
        <div className="text-orange-700 text-sm">
          <div className="font-medium mb-1">ไม่พบข้อมูลกะดึกย้อนหลัง</div>
          <div className="text-orange-600">
            ไม่มีข้อมูลกะดึกของวันที่ {previousDateStr} {wardName ? `ของ${wardName}` : ''}
            <br />
            จำนวนผู้ป่วยคงเหลือจะต้องกรอกเอง หรือเริ่มต้นจากศูนย์
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviousDataNotification; 