'use client';

import React from 'react';
import NavBar from '@/app/components/ui/NavBar';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <NavBar />
      <div className="flex-grow flex justify-center items-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="mt-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">
            กำลังโหลดข้อมูล...
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">กรุณารอสักครู่ ระบบกำลังเตรียมข้อมูลสรุปสำหรับคุณ</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 