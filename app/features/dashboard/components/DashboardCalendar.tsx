import React from 'react';
import CalendarWithEvents, { Event } from './CalendarWithEvents';
import { useTheme } from 'next-themes';
import { DashboardCalendarProps } from './types/componentInterfaces';
import { CalendarMarker } from './types';

// Mapping from marker status to event color
const statusToColorMap = {
  draft: 'yellow',
  final: 'emerald',
  approved: 'purple',
};

/**
 * Component แสดงปฏิทินใน Dashboard
 */
const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
  selectedDate,
  onDateChange,
  markers,
}) => {
  const { theme } = useTheme();

  // Convert markers to events for CalendarWithEvents
  const calendarEvents: Event[] = markers.map((marker, index) => ({
    id: `marker-${index}-${marker.date}`,
    date: marker.date,
    title: `Status: ${marker.status}`,
    description: `Data for this date is ${marker.status}.`,
    startTime: '00:00',
    endTime: '23:59',
    color: statusToColorMap[marker.status] as 'purple' | 'sky' | 'emerald' | 'yellow',
  }));

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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายงานฉบับร่าง</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายงานสมบูรณ์บางเวร</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายงานที่อนุมัติแล้วทั้ง 2 เวร</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardCalendar; 