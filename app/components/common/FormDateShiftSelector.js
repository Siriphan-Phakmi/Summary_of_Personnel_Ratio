import React, { useState, useEffect } from 'react';
import CalendarSection from './CalendarSection';
import ShiftSelection from './ShiftSelection';

/**
 * A reusable component that combines calendar selection and shift selection
 * Can be used across different forms to maintain consistent UI
 */
const FormDateShiftSelector = ({
  selectedDate,
  onDateSelect,
  datesWithData = [],
  showCalendar,
  setShowCalendar,
  thaiDate,
  selectedShift,
  onShiftChange,
  theme = 'light',
}) => {
  // เพิ่ม state สำหรับเก็บเวลาปัจจุบัน
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // อัพเดทเวลาทุก 1 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // เคลียร์ timer เมื่อ component unmount
    return () => clearInterval(timer);
  }, []);
  
  // ฟอร์แมตเวลาให้อยู่ในรูปแบบ HH:MM:SS
  const formatTime = (date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  // ป้องกันการเกิด error ถ้า onShiftChange ไม่ใช่ฟังก์ชัน
  const handleShiftChange = (value) => {
    if (typeof onShiftChange === 'function') {
      onShiftChange(value);
    } else {
      console.warn('onShiftChange is not a function in FormDateShiftSelector');
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Section with Current Time */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <CalendarSection
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            datesWithData={datesWithData}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
            thaiDate={thaiDate}
            theme={theme}
          />
        </div>
        {/* Current Time Display */}
        <div className={`ml-4 p-3 rounded-lg ${
          theme === 'dark' 
            ? 'bg-gray-800 text-white border border-gray-700' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className="text-center font-medium mb-1">เวลาปัจจุบัน</div>
          <div className="text-xl font-bold">{formatTime(currentTime)}</div>
          <div className="text-xs mt-1 opacity-80">
            {currentTime.getHours() >= 7 && currentTime.getHours() < 19 
              ? 'อยู่ในช่วงกะเช้า (07:00-19:00)' 
              : 'อยู่ในช่วงกะดึก (19:00-07:00)'}
          </div>
        </div>
      </div>
      
      {/* Shift Selection */}
      <div className={`${
        theme === 'dark' 
          ? 'bg-gray-800/70 border border-gray-700 hover:bg-gray-700/80' 
          : 'bg-white/60 hover:shadow-md'
      } backdrop-blur-sm rounded-xl p-4 shadow-sm transition-all`}>
        <div className={`mb-2 font-medium ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-700'
        }`}>กะทำงาน <span className="text-[#0ab4ab]">*</span></div>
        <ShiftSelection 
          selectedShift={selectedShift}
          onShiftChange={handleShiftChange}
          variant="form" 
          theme={theme}
        />
        <div className={`text-xs mt-2 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          การเปลี่ยนกะจะทำให้ข้อมูลที่ยังไม่ได้บันทึกหายไป กรุณาบันทึกข้อมูลก่อนเปลี่ยนกะ
        </div>
      </div>
    </div>
  );
};

export default FormDateShiftSelector; 