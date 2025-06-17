import React from 'react';

const ChartEmptyState = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ไม่พบข้อมูล</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
        ไม่พบข้อมูลสำหรับวันที่เลือก กรุณาเลือกวันที่มีการบันทึกข้อมูล หรือตรวจสอบการอนุมัติจากหัวหน้า
      </p>
    </div>
  );
};

export default ChartEmptyState; 