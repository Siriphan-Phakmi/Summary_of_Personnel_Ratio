'use client';

import React from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { FiFileText, FiClock, FiUser } from 'react-icons/fi';
import { Button } from '@/app/components/ui/Button';
import { formatTimestamp } from '@/app/lib/utils/dateUtils';
import { formatShift } from '../utils/formatUtils';

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
  const formattedDate = formatTimestamp(draftData.updatedAt);
  const shiftText = formatShift(draftData.shift);

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