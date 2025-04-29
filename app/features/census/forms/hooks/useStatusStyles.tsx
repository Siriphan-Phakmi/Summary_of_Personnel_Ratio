'use client';

import React from 'react';
import { FormStatus } from '@/app/core/types/ward';
import { FiEdit2, FiCheckCircle, FiClock, FiX } from 'react-icons/fi';

/**
 * Custom hook that provides UI transformations for form status
 * including CSS classes, colors, text, and icons.
 */
const useStatusStyles = () => {
  /**
   * Map status to CSS class
   */
  const getStatusClass = (status: FormStatus | null): string => {
    if (status === FormStatus.APPROVED) return 'shift-approved';
    if (status === FormStatus.FINAL) return 'shift-pending';
    if (status === FormStatus.DRAFT) return 'shift-draft';
    if (status === FormStatus.REJECTED) return 'shift-rejected';
    return 'shift-none';
  };

  /**
   * Map status to HEX color code
   */
  const getStatusColor = (status: FormStatus | null): string => {
    if (status === FormStatus.APPROVED) return '#10b981';
    if (status === FormStatus.FINAL) return '#f59e0b';
    if (status === FormStatus.DRAFT) return '#6b7280';
    if (status === FormStatus.REJECTED) return '#ef4444';
    return '#9ca3af';
  };

  /**
   * Map status to Thai text label
   */
  const getStatusText = (status: FormStatus | null): string => {
    if (status === FormStatus.APPROVED) return 'อนุมัติแล้ว';
    if (status === FormStatus.FINAL) return 'รออนุมัติ';
    if (status === FormStatus.DRAFT) return 'ร่าง';
    if (status === FormStatus.REJECTED) return 'ถูกปฏิเสธ';
    return 'ไม่มีข้อมูล';
  };

  /**
   * Map status to React icon
   */
  const getStatusIcon = (status: FormStatus | null, baseClassName = 'mr-2 h-4 w-4 status-icon'): React.ReactNode | null => {
    const draftClasses = baseClassName;
    const approvedClasses = `${baseClassName} text-green-500`;
    const finalClasses = `${baseClassName} text-yellow-500`;
    const rejectedClasses = `${baseClassName} text-red-500`;

    if (status === FormStatus.DRAFT) {
      return <FiEdit2 className={draftClasses} aria-label="สถานะร่าง" />;
    }
    if (status === FormStatus.APPROVED) {
      return <FiCheckCircle className={approvedClasses} aria-label="สถานะอนุมัติแล้ว" />;
    }
    if (status === FormStatus.FINAL) {
      return <FiClock className={finalClasses} aria-label="สถานะรออนุมัติ" />;
    }
    if (status === FormStatus.REJECTED) {
      return <FiX className={rejectedClasses} aria-label="สถานะถูกปฏิเสธ" />;
    }
    return null;
  };

  /**
   * Map status to button variant
   */
  const getStatusVariant = (status: FormStatus | null, isSelected = false): 'primary' | 'secondary' | 'outline' | 'destructive' => {
    if (isSelected) return 'primary';
    if (status === FormStatus.FINAL || status === FormStatus.APPROVED) return 'secondary';
    if (status === FormStatus.DRAFT) return 'outline';
    if (status === FormStatus.REJECTED) return 'destructive';
    return 'secondary';
  };

  return { getStatusClass, getStatusColor, getStatusText, getStatusIcon, getStatusVariant };
};

export default useStatusStyles; 