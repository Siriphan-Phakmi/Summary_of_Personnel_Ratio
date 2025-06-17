'use client';

import React from 'react';
import { LoadingSpinner } from '@/app/components/ui';

interface FormLoadingSectionProps {
  isDataLoading: boolean;
  dataError: string | null;
  wards: any[];
  selectedWard: string;
}

export const FormLoadingSection: React.FC<FormLoadingSectionProps> = ({
  isDataLoading,
  dataError,
  wards,
  selectedWard,
}) => {
  // Loading state
  if (isDataLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8">
        <LoadingSpinner size="md" color="primary" />
        <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
          กำลังโหลดข้อมูล...
        </p>
      </div>
    );
  }

  // Error state
  if (dataError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              เกิดข้อผิดพลาด
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {dataError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No wards available
  if (wards.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              ไม่พบข้อมูลแผนก
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              คุณไม่มีสิทธิ์เข้าถึงแผนกใดๆ หรือยังไม่มีแผนกในระบบ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No ward selected
  if (!selectedWard) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              กรุณาเลือกแผนก
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              เลือกแผนกและวันที่เพื่อเริ่มกรอกข้อมูล Daily Census Form
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null; // Show form
};

export default FormLoadingSection; 