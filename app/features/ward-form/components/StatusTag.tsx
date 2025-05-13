'use client';

import React from 'react';
import { FormStatus } from '@/app/core/types/ward';
import useStatusStyles from '../hooks/useStatusStyles';
import '../styles/index.css';

interface StatusTagProps {
  status: FormStatus | null;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  classNames?: string;
  textOnly?: boolean; // เพิ่มตัวเลือกให้แสดงเฉพาะข้อความโดยไม่มีพื้นหลัง
}

/**
 * Component สำหรับแสดงแท็กสถานะในรูปแบบสี่เหลี่ยม เหมาะสำหรับแสดงในตาราง
 */
const StatusTag: React.FC<StatusTagProps> = ({
  status,
  showIcon = true,
  size = 'sm',
  classNames = '',
  textOnly = false,
}) => {
  const { getStatusClass, getStatusText, getStatusIcon, getStatusColor } = useStatusStyles();

  // กำหนดขนาดของแท็กตามค่า size
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  };

  // กำหนดค่าเริ่มต้นของคลาส
  let tagBaseClasses = `
    inline-flex items-center
    font-medium
    ${sizeClasses[size]}
  `;

  // เพิ่มคลาสการแสดงผลตามโหมด
  if (!textOnly) {
    tagBaseClasses += ' rounded'; // ใช้ rounded ปกติไม่ใช่ rounded-full
  }

  // รวมคลาสทั้งหมดสำหรับแสดงแท็ก
  const tagClasses = `
    ${tagBaseClasses}
    ${getStatusClass(status)}
    ${classNames}
  `;

  // กำหนดสไตล์ตรงๆ สำหรับแท็ก
  let tagStyles: React.CSSProperties = {};
  
  if (textOnly) {
    // โหมดแสดงเฉพาะข้อความ
    tagStyles = {
      color: status ? getStatusColor(status) : '#6b7280',
    };
  } else {
    // โหมดแสดงปกติ
    tagStyles = {
      backgroundColor: status ? `${getStatusColor(status)}20` : '#9ca3af20', // ใช้ alpha 20% (32/255)
      color: status ? getStatusColor(status) : '#6b7280',
      borderColor: status ? getStatusColor(status) : '#9ca3af',
      borderWidth: '1px',
    };
  }

  // ขนาดไอคอนตาม size
  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  // รวมคลาสสำหรับไอคอน
  const iconClassName = `mr-1 ${iconSizeClass[size]} status-icon`;

  return (
    <span className={tagClasses} style={tagStyles} data-status={status || 'none'}>
      {showIcon && status && getStatusIcon(status, iconClassName)}
      <span>{getStatusText(status)}</span>
    </span>
  );
};

export default StatusTag; 