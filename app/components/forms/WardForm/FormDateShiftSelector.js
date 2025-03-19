import React, { useState, useEffect } from 'react';
import { formatThaiDate } from '../../../utils/dateUtils';
import { getCurrentDate } from '../../../utils/dateUtils';
import ShiftSelection from '../../../components/common/ShiftSelection';
import Calendar from '../../../components/ui/Calendar';

/**
 * Component สำหรับเลือกวันที่และกะการทำงาน
 */
const FormDateShiftSelector = ({
    selectedDate,
    selectedShift,
    onDateSelect,
    onShiftChange,
    showCalendar,
    setShowCalendar,
    datesWithData = [],
    thaiDate = formatThaiDate(selectedDate || getCurrentDate()),
    theme = 'light'
}) => {
    // สร้าง local state สำหรับ fallback กรณีที่ไม่มี prop showCalendar
    const [localShowCalendar, setLocalShowCalendar] = useState(false);
    
    // ตรวจสอบว่า showCalendar และ setShowCalendar เป็น undefined หรือไม่
    const isShowCalendarDefined = showCalendar !== undefined;
    const isSetShowCalendarFunction = typeof setShowCalendar === 'function';
    
    // ใช้ค่า showCalendar จาก props ถ้ามี มิฉะนั้นใช้ค่าจาก local state
    const calendarVisible = isShowCalendarDefined ? showCalendar : localShowCalendar;

    /**
     * อีเวนต์เมื่อเลือกวันที่
     * @param {Date} date - วันที่ที่เลือก
     */
    const handleDateSelect = (date) => {
        if (typeof onDateSelect === 'function') {
            // ตรวจสอบว่า date เป็น Date object จริง ๆ
            if (date instanceof Date && !isNaN(date)) {
                onDateSelect(date);
            } else {
                console.error('Invalid date object in handleDateSelect:', date);
            }
        }
        handleToggleCalendar(false);
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
    
    /**
     * อีเวนต์เมื่อคลิกที่ปุ่มแสดง/ซ่อนปฏิทิน
     * @param {boolean} value - สถานะที่ต้องการเปลี่ยน
     */
    const handleToggleCalendar = (value) => {
        if (isSetShowCalendarFunction) {
            setShowCalendar(value);
        } else {
            setLocalShowCalendar(value);
            console.warn('setShowCalendar is not a function in FormDateShiftSelector, using local state instead');
        }
    };
    
    return (
        <div className="mb-2">
            <div className="grid grid-cols-1 gap-4">
                {/* วันที่ */}
                <div className="relative w-full">
                    <div onClick={() => handleToggleCalendar(!calendarVisible)} className="cursor-pointer">
                        <div className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'} border rounded-lg p-5 flex items-center h-full shadow-sm hover:shadow-md transition-all duration-300`}>
                            <div className={`${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'} p-3 rounded-full mr-4`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-1 text-sm`}>วันที่</div>
                                <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-800'} font-medium text-lg`}>{thaiDate}</div>
                            </div>
                            <div className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    {/* Calendar component */}
                    {calendarVisible && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{maxWidth: '350px'}}>
                                <div className="flex justify-between items-center p-3 bg-blue-50 border-b border-blue-100">
                                    <h3 className="font-medium text-blue-700">เลือกวันที่</h3>
                                    <button 
                                        onClick={() => handleToggleCalendar(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <Calendar
                                    selectedDate={selectedDate}
                                    onDateSelect={handleDateSelect}
                                    onClickOutside={() => handleToggleCalendar(false)}
                                    datesWithData={datesWithData}
                                    variant="form"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormDateShiftSelector; 