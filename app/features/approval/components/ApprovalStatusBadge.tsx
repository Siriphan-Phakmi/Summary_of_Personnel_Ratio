'use client';

import React from 'react';
import { FormStatus } from '@/app/features/ward-form/types/ward';

interface ApprovalStatusBadgeProps {
  status: FormStatus | string;
  config?: { [key: string]: string };
}

export const ApprovalStatusBadge: React.FC<ApprovalStatusBadgeProps> = ({ status, config }) => {
  const getStatusInfo = (status: FormStatus | string) => {
    switch (status) {
      case FormStatus.DRAFT:
        return { 
          text: config?.draft || 'ร่าง', 
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' 
        };
      case FormStatus.FINAL:
        return { 
          text: config?.pending || 'รอการตรวจสอบ', 
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' 
        };
      case FormStatus.APPROVED:
        return { 
          text: config?.approved || 'อนุมัติแล้ว', 
          className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' 
        };
      case FormStatus.REJECTED:
        return { 
          text: config?.rejected || 'ปฏิเสธ', 
          className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' 
        };
      default:
        return { 
          text: status || (config?.unknown || 'ไม่ทราบสถานะ'), 
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' 
        };
    }
  };

  const { text, className } = getStatusInfo(status);
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${className}`}>
      {text}
    </span>
  );
}; 