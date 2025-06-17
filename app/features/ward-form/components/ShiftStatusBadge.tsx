'use client';

import React from 'react';
import { FormStatus } from '@/app/features/ward-form/types/ward';
import useStatusStyles from '../hooks/useStatusStyles';
import '../styles/index.css'; // Import main CSS file

interface ShiftStatusBadgeProps {
  status: FormStatus | null;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  classNames?: string;
}

/**
 * Component สำหรับแสดงป้ายชื่อ (badge) สถานะของฟอร์ม
 */
const ShiftStatusBadge: React.FC<ShiftStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  classNames = '',
}) => {
  const { getStatusClass, getStatusText, getStatusIcon, getStatusColor } = useStatusStyles();

  // กำหนดขนาดของแบดจ์ตามค่า size
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  // รวมคลาสทั้งหมดสำหรับแสดงแบดจ์
  const badgeClasses = `
    inline-flex items-center justify-center 
    font-medium rounded-full
    ${sizeClasses[size]}
    ${getStatusClass(status)}
    ${classNames}
  `;

  // กำหนดสไตล์ตรงๆ สำหรับแบดจ์
  const badgeStyles = {
    backgroundColor: status ? `${getStatusColor(status)}20` : '#9ca3af20', // ใช้ alpha 20% (32/255)
    color: status ? getStatusColor(status) : '#6b7280',
    borderColor: status ? getStatusColor(status) : '#9ca3af',
    borderWidth: '1px',
  };

  // ขนาดไอคอนตาม size
  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // รวมคลาสสำหรับไอคอน
  const iconClassName = `mr-1 ${iconSizeClass[size]} status-icon`;

  return (
    <span className={badgeClasses} style={badgeStyles} data-status={status || 'none'}>
      {showIcon && status && getStatusIcon(status, iconClassName)}
      <span>{getStatusText(status)}</span>
    </span>
  );
};

export default ShiftStatusBadge; 