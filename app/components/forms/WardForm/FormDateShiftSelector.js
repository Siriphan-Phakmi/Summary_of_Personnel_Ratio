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
        <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* วันที่ */}
                <div className="relative md:col-span-5">
                    <div onClick={() => handleToggleCalendar(!calendarVisible)} className="cursor-pointer">
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
                                    onClickOutside={() => handleToggleCalendar(false)}
                                    datesWithData={datesWithData}
                                    variant="form"
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