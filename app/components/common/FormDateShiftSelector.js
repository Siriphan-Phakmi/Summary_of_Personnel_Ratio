import React, { useState } from 'react';
import { formatThaiDate, getCurrentDate } from '../../utils/dateUtils';
import Calendar from '../ui/Calendar';
import ShiftSelection from './ShiftSelection';

/**
 * Component สำหรับเลือกวันที่และกะการทำงาน
 */
const FormDateShiftSelector = ({
  selectedDate,
  onDateSelect,
  onDateChange,
  datesWithData = [],
  showCalendar,
  setShowCalendar,
  thaiDate,
  selectedShift,
  onShiftChange,
  theme = 'light',
}) => {
  // สร้าง local state สำหรับ fallback กรณีที่ไม่มี prop showCalendar
  const [localShowCalendar, setLocalShowCalendar] = useState(false);
  
  // ตรวจสอบว่า showCalendar และ setShowCalendar เป็น undefined หรือไม่
  const isShowCalendarDefined = showCalendar !== undefined;
  const isSetShowCalendarFunction = typeof setShowCalendar === 'function';
  
  // ใช้ค่า showCalendar จาก props ถ้ามี มิฉะนั้นใช้ค่าจาก local state
  const calendarVisible = isShowCalendarDefined ? showCalendar : localShowCalendar;
  
  // สร้างฟังก์ชันสำหรับเปิด/ปิดปฏิทิน
  const toggleCalendar = (value) => {
    if (isSetShowCalendarFunction) {
      setShowCalendar(value);
    } else {
      setLocalShowCalendar(value);
    }
  };
  
  /**
   * อีเวนต์เมื่อเลือกวันที่
   * @param {Date} date - วันที่ที่เลือก
   */
  const handleDateSelect = (date) => {
    if (typeof onDateSelect === 'function') {
      onDateSelect(date);
    }
    toggleCalendar(false);
  };
  
  /**
   * อีเวนต์เมื่อเลือกกะทำงาน
   * @param {string} shift - กะทำงานที่เลือก
   */
  const handleShiftChange = (shift) => {
    if (typeof onShiftChange === 'function') {
      onShiftChange(shift);
    }
  };

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* วันที่ */}
        <div className="relative md:col-span-5">
          <div onClick={() => toggleCalendar(!calendarVisible)} className="cursor-pointer">
            <div className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} border rounded-lg p-3 flex items-center h-full shadow-sm hover:shadow transition-all`}>
              <span className="mr-3 text-blue-500">📅</span>
              <div className="flex-1">
                <div className="font-medium text-gray-600 mb-0.5">วันที่</div>
                <div className="text-gray-900 font-medium">{thaiDate}</div>
              </div>
            </div>
          </div>
          
          {/* Calendar component */}
          {calendarVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{maxWidth: '280px'}}>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onClickOutside={() => toggleCalendar(false)}
                  datesWithData={datesWithData}
                  variant="form"
                  theme={theme}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* กะการทำงาน */}
        <div className="md:col-span-7">
          <ShiftSelection
            selectedShift={selectedShift}
            onShiftChange={handleShiftChange}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
};

export default FormDateShiftSelector; 