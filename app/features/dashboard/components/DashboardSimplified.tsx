'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import NavBar from '@/app/core/ui/NavBar';
import DashboardOverview from './DashboardOverview';

export default function DashboardSimplified() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // สร้างข้อมูล mock สำหรับทดสอบ
  const mockStats = {
    opd24hr: 152,
    oldPatient: 111,
    newPatient: 38,
    admit24hr: 28
  };
  
  return (
    <>
      <NavBar />
      <div className="container mx-auto p-4 pt-[80px] min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
        <h1 className="text-2xl font-bold mb-6 text-center page-title">Daily Patient Census and Staffing</h1>
        
        <div className="mb-6 no-print">
          <label htmlFor="date-select" className="block text-sm font-medium mb-1">เลือกวันที่:</label>
          <input
            type="date"
            id="date-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input w-full max-w-xs"
          />
        </div>
        
        <DashboardOverview 
          date={new Date(selectedDate)}
          totalStats={mockStats}
        />
        
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 text-center">แผนภูมิจำนวนผู้ป่วย</h2>
          <p className="text-center text-gray-500">แผนภูมิกำลังถูกพัฒนา...</p>
        </div>
      </div>
    </>
  );
} 