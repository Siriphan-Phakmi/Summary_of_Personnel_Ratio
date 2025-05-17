'use client';

import React from 'react';
import { WardForm, ShiftType } from '@/app/core/types/ward';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { FiFileText, FiClock, FiUser } from 'react-icons/fi';
import { Button } from '@/app/core/ui';

interface DraftNotificationProps {
  draftData: WardForm;
  onLoadDraft: () => void;
  className?: string;
}

const DraftNotification: React.FC<DraftNotificationProps> = ({
  draftData,
  onLoadDraft,
  className = '',
}) => {
  // Format date nicely for display
  const formattedDate = draftData.updatedAt 
    ? format(
        // Check if it has toDate method (Firebase Timestamp)
        typeof draftData.updatedAt === 'object' && draftData.updatedAt && 'toDate' in draftData.updatedAt 
            ? (draftData.updatedAt as any).toDate() 
            : new Date(draftData.updatedAt as string | number | Date), 
        'dd MMM yyyy, HH:mm น.', 
        { locale: th }
      )
    : 'ไม่ระบุเวลา';
  
  // Determine shift text
  const shiftText = draftData.shift === ShiftType.MORNING 
    ? 'เวรเช้า (เวลา 08:00 น.)' 
    : 'เวรดึก (เวลา 16:00 น.)';

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center mb-1">
            <FiFileText className="text-yellow-500 mr-2" />
            <h3 className="font-medium text-yellow-700">พบข้อมูลร่างที่บันทึกไว้ก่อนหน้า</h3>
          </div>
          
          <div className="text-sm text-gray-600 ml-6 space-y-1">
            <div className="flex items-center">
              <FiClock className="text-gray-400 mr-2" />
              <span>บันทึกเมื่อ: {formattedDate} ({shiftText})</span>
            </div>
            <div className="flex items-center">
              <FiUser className="text-gray-400 mr-2" />
              <span>ผู้บันทึก: {draftData.recorderFirstName} {draftData.recorderLastName}</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="secondary" 
          onClick={onLoadDraft}
          className="whitespace-nowrap bg-yellow-400 hover:bg-yellow-500 text-yellow-900 dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:text-yellow-950"
          size="sm"
        >
          โหลดข้อมูลร่าง
        </Button>
      </div>
    </div>
  );
};

export default DraftNotification; 