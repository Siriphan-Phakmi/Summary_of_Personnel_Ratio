'use client';

import React from 'react';
import { FormStatus } from '@/app/core/types/ward';

interface FormStatusBadgeProps {
  status: FormStatus | string;
}

export const FormStatusBadge: React.FC<FormStatusBadgeProps> = ({ status }) => {
  const baseClasses = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  if (status === FormStatus.APPROVED) {
    return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}>อนุมัติแล้ว</span>;
  } else if (status === FormStatus.REJECTED) {
    return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}>ปฏิเสธ</span>;
  } else if (status === FormStatus.DRAFT) {
    return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`}>ร่าง</span>;
  } else if (status === FormStatus.FINAL) {
    return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`}>รออนุมัติ</span>;
  }
  
  return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>{status}</span>;
};

export default FormStatusBadge; 