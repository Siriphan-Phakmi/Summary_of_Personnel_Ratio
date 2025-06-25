'use client';

import React, { useMemo } from 'react';
import CalendarWithEvents, { Event } from '../CalendarWithEvents';
import { useTheme } from 'next-themes';
import { CalendarMarker } from '../../services/calendarService';

interface DashboardCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  markers: CalendarMarker[];
  isLoading?: boolean;
}

export default function DashboardCalendar({
  selectedDate,
  onDateChange,
  markers,
  isLoading = false
}: DashboardCalendarProps) {
  const { theme } = useTheme();
  
  // แปลงสถานะจาก CalendarMarker เป็นสีที่ใช้ในปฏิทิน
  const getEventColor = (status: string): 'purple' | 'sky' | 'emerald' | 'yellow' => {
    switch (status) {
      case 'complete':
        return 'emerald';
      case 'partial':
        return 'sky';
      case 'draft':
        return 'yellow';
      case 'missing':
      default:
        return 'purple';
    }
  };
  
  // Format markers for calendar
  const calendarEvents = useMemo(() => markers.map((marker, index) => ({
    id: `marker-${index}-${marker.date}`,
    date: marker.date,
    title: `Status: ${marker.status}`,
    description: `Data Status: ${marker.status}`,
    startTime: '00:00',
    endTime: '23:59',
    color: getEventColor(marker.status),
  })), [markers]);

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <CalendarWithEvents
        events={calendarEvents}
        darkMode={theme === 'dark'}
        showUpcomingEvents={false}
        className="rounded-xl"
        onDateChange={onDateChange}
      />
      
      <div className="flex justify-center p-3 space-x-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ร่าง</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ข้อมูลสมบูรณ์</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-sky-500 mr-2"></span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ข้อมูลบางส่วน</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ไม่มีข้อมูล</span>
        </div>
      </div>
    </div>
  );
} 