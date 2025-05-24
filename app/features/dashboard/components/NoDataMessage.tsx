'use client';

import React from 'react';
import { NoDataMessageProps } from './types/component-types';

/**
 * คอมโพเนนต์แสดงข้อความเมื่อไม่มีข้อมูล
 */
const NoDataMessage: React.FC<NoDataMessageProps> = ({ 
  message = 'ไม่พบข้อมูล', 
  subMessage = 'ข้อมูลยังไม่ถูกบันทึกโดยผู้ใช้งาน', 
  icon = 'error',
  iconColor,
  className = ''
}) => {
  
  // เลือกไอคอนตามประเภท
  const renderIcon = () => {
    switch (icon) {
      case 'user':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor || 'text-gray-400'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'chart':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor || 'text-gray-400'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'table':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor || 'text-gray-400'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'compare':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor || 'text-gray-400'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'calendar':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor || 'text-gray-400'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'error':
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor || 'text-gray-400'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  return (
    <div className={`h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm ${className}`}>
      {renderIcon()}
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{message}</h3>
      {subMessage && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
          {subMessage}
        </p>
      )}
    </div>
  );
};

export default NoDataMessage; 