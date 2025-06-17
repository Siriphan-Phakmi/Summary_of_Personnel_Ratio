import React from 'react';

const ChartLoadingState = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">กำลังโหลดข้อมูล</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
        กำลังดึงข้อมูลเตียงจากระบบ โปรดรอสักครู่...
      </p>
    </div>
  );
};

export default ChartLoadingState; 