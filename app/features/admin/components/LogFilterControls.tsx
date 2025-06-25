'use client';

import React from 'react';
import { SYSTEM_LOGS_COLLECTION, USER_ACTIVITY_LOGS_COLLECTION } from '@/app/features/auth/types/log';

interface LogFilterControlsProps {
  filters: {
    logCollection: string;
    logType: string;
    dateRange: string;
    username: string;
    limitCount: number;
  };
  setters: {
    handleLogCollectionChange: (value: string) => void;
    setLogType: (value: string) => void;
    setDateRange: (value: string) => void;
    setUsername: (value: string) => void;
    setLimitCount: (value: number) => void;
  };
  onSearch: () => void;
  onCleanup: (days: number) => void;
}

export const LogFilterControls: React.FC<LogFilterControlsProps> = ({ filters, setters, onSearch, onCleanup }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Log Collection Select */}
        <div>
          <label htmlFor="logCollection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภท Log</label>
          <select 
            id="logCollection"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={filters.logCollection}
            onChange={(e) => setters.handleLogCollectionChange(e.target.value)}
          >
            <option value={SYSTEM_LOGS_COLLECTION}>System Logs</option>
            <option value={USER_ACTIVITY_LOGS_COLLECTION}>User Management Logs</option>
          </select>
        </div>
        
        {/* Action Type Select */}
        <div>
          <label htmlFor="logType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภทการกระทำ</label>
          <select 
            id="logType"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={filters.logType}
            onChange={(e) => setters.setLogType(e.target.value)}
          >
            <option value="all">ทั้งหมด</option>
            <option value="auth.login">เข้าสู่ระบบ</option>
            <option value="auth.logout">ออกจากระบบ</option>
            <option value="auth.login_failed">เข้าสู่ระบบล้มเหลว</option>
            <option value="page.access">เข้าถึงหน้า</option>
            <option value="system.error">ข้อผิดพลาดระบบ</option>
            {filters.logCollection === USER_ACTIVITY_LOGS_COLLECTION && (
              <>
                <option value="user.action.create">สร้างข้อมูล</option>
                <option value="user.action.update">แก้ไขข้อมูล</option>
                <option value="user.action.delete">ลบข้อมูล</option>
              </>
            )}
          </select>
        </div>
        
        {/* Date Range Select */}
        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ช่วงเวลา</label>
          <select 
            id="dateRange"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={filters.dateRange}
            onChange={(e) => setters.setDateRange(e.target.value)}
          >
            <option value="1">1 วันล่าสุด</option>
            <option value="7">7 วันล่าสุด</option>
            <option value="30">30 วันล่าสุด</option>
            <option value="90">90 วันล่าสุด</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        
        {/* Username Search */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อผู้ใช้ (Client-side Filter)</label>
          <div className="flex">
            <input 
              id="username"
              type="text" 
              placeholder="ค้นหาชื่อผู้ใช้..." 
              className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.username}
              onChange={(e) => setters.setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            />
            <button 
              className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onSearch}
              aria-label="Search Logs"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex flex-wrap justify-between items-center">
        {/* Limit Select */}
        <div>
          <label htmlFor="limitCount" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">จำนวนรายการ:</label>
          <select 
            id="limitCount"
            className="p-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={filters.limitCount}
            onChange={(e) => setters.setLimitCount(parseInt(e.target.value, 10))}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        
        {/* Cleanup Buttons */}
        <div className="mt-2 md:mt-0">
          <button 
            className="bg-red-500 text-white px-3 py-1 text-sm rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-2"
            onClick={() => onCleanup(30)}
          >
            ลบบันทึกเก่ากว่า 30 วัน
          </button>
          <button 
            className="bg-red-700 text-white px-3 py-1 text-sm rounded-md shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700"
            onClick={() => onCleanup(90)}
          >
            ลบบันทึกเก่ากว่า 90 วัน
          </button>
        </div>
      </div>
    </div>
  );
}; 