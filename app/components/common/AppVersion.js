'use client';

import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../../config/version';

export default function AppVersion() {
  // เพิ่ม state สำหรับเวลาปัจจุบัน
  const [currentTime, setCurrentTime] = useState(new Date());

  // อัพเดทเวลาทุกๆ 1 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // ฟังก์ชันจัดรูปแบบเวลา
  const formatTime = (date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // ตรวจสอบกะปัจจุบัน
  const getCurrentShift = () => {
    const hours = currentTime.getHours();
    return hours >= 7 && hours < 19 ? '(07:00-19:00)' : '(19:00-07:00)';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200 hover:bg-white/90 transition-all duration-300">
        <div className="flex flex-col space-y-1">
          {/* แสดงเวลาปัจจุบัน */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <div className="flex items-center">
              <span className="text-xs font-medium text-gray-500 mr-1">เวลาปัจจุบัน</span>
              <span className="text-sm font-bold text-[#0ab4ab]">{formatTime(currentTime)}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 pl-4">
            กะ{currentTime.getHours() >= 7 && currentTime.getHours() < 19 ? 'เช้า' : 'ดึก'} {getCurrentShift()}
          </div>
          
          {/* แสดงเวอร์ชัน */}
          <div className="flex items-center space-x-2 pt-1 mt-1 border-t border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 