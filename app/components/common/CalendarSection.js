import { formatThaiDate } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import { useState } from 'react';

const CalendarSection = ({
    selectedDate,
    onDateSelect,
    datesWithData = [],
    showCalendar,
    setShowCalendar,
    thaiDate,
    variant = 'form',
    theme = 'light'
}) => {
    // สร้าง local state สำหรับ fallback กรณีที่ไม่มี prop showCalendar
    const [localShowCalendar, setLocalShowCalendar] = useState(false);
    
    // ตรวจสอบว่า setShowCalendar เป็นฟังก์ชันหรือไม่
    const isShowCalendarFunction = typeof setShowCalendar === 'function';
    
    // ใช้ค่า showCalendar จาก props ถ้ามี มิฉะนั้นใช้ค่าจาก local state
    const calendarVisible = showCalendar !== undefined ? showCalendar : localShowCalendar;
    
    // สร้างฟังก์ชันสำหรับเปิด/ปิดปฏิทิน
    const toggleCalendar = (value) => {
        if (isShowCalendarFunction) {
            setShowCalendar(value);
        } else {
            setLocalShowCalendar(value);
            console.warn('setShowCalendar is not a function in CalendarSection, using local state instead');
        }
    };
    
    // สร้างฟังก์ชันสำหรับจัดการการคลิกปุ่มเปิด/ปิดปฏิทิน
    const handleButtonClick = () => {
        toggleCalendar(!calendarVisible);
    };
    
    // สร้างฟังก์ชันสำหรับจัดการเมื่อคลิกภายนอกปฏิทิน
    const handleClickOutside = () => {
        toggleCalendar(false);
    };
    
    return (
        <div className="relative">
            <div className={`${
                theme === 'dark' 
                    ? 'bg-gray-800/60 border border-gray-700' 
                    : 'bg-white/60'
            } backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all`}>
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <button
                        type="button"
                        onClick={handleButtonClick}
                        className={`w-full md:w-auto px-4 py-2 ${
                            theme === 'dark'
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                : 'bg-gradient-to-r from-[#0ab4ab] to-blue-500 hover:from-[#0ab4ab]/90 hover:to-blue-600'
                        } text-white rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 shadow-md text-sm`}
                    >
                        {calendarVisible ? 'ซ่อนปฏิทิน' : 'เลือกวันที่'}
                    </button>
                    <div className={`${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    } space-y-0.5 text-center md:text-left text-sm`}>
                        <div className="font-medium text-[#0ab4ab]">วันที่ปัจจุบัน : {formatThaiDate(new Date())}</div>
                        <div className={`${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`}>วันที่เลือก : {thaiDate}</div>
                    </div>
                </div>
            </div>

            {/* Calendar Modal */}
            {calendarVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className={`relative ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                    } rounded-2xl shadow-2xl transform transition-all`}>
                        <Calendar
                            selectedDate={selectedDate}
                            onDateSelect={onDateSelect}
                            onClickOutside={handleClickOutside}
                            datesWithData={datesWithData}
                            variant={variant}
                            theme={theme}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarSection; 