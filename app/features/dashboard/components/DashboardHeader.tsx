import React from 'react';
import { format } from 'date-fns';
import { Ward } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getThaiDayName } from '../utils/dateUtils';

interface DashboardHeaderProps {
  selectedDate: Date;
  dateRange: string;
  startDate: string;
  endDate: string;
  wards: Ward[];
  user: User | null;
  onDateRangeChange: (value: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  applyCustomDateRange: () => void;
}

/**
 * Component แสดงส่วนหัวของ Dashboard ประกอบด้วยชื่อ Dashboard และตัวเลือกช่วงวันที่
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  selectedDate,
  dateRange,
  startDate,
  endDate,
  wards,
  user,
  onDateRangeChange,
  setStartDate,
  setEndDate,
  applyCustomDateRange
}) => {
  // ตรวจสอบว่าผู้ใช้เป็นผู้ใช้ทั่วไปหรือไม่
  const isRegularUser = user?.role !== UserRole.ADMIN && 
                        user?.role !== UserRole.DEVELOPER;
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          วันที่ {formattedDate} ({getThaiDayName(formattedDate)})
          {isRegularUser && user?.floor && (
            <span className="ml-2 text-blue-500">
              [แผนก {wards.find(w => w.id?.toUpperCase() === user.floor?.toUpperCase())?.name || user.floor}]
            </span>
          )}
        </p>
      </div>
      
      <div className="flex space-x-2">
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">วันนี้</option>
          <option value="custom">กำหนดเอง</option>
        </select>
        
        {dateRange === 'custom' && (
          <div className="flex space-x-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={applyCustomDateRange}
              className="px-2 py-1 rounded-md text-sm font-medium bg-blue-600 text-white"
            >
              ตกลง
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader; 