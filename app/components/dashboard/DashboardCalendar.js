'use client';
import { useState } from 'react';
import Calendar from '../ui/Calendar';
import { formatThaiDate } from '../../utils/dateUtils';

const DashboardCalendar = ({ 
    datesWithData, 
    onDateSelect,
    selectedDate: propSelectedDate,
    showCalendar: propShowCalendar,
    setShowCalendar: propSetShowCalendar
}) => {
    // ใช้ค่าจาก props หรือสร้าง state ใหม่
    const [selectedDate, setSelectedDate] = useState(propSelectedDate || new Date());
    const [localShowCalendar, setLocalShowCalendar] = useState(false);
    const [thaiDate, setThaiDate] = useState(formatThaiDate(propSelectedDate || new Date()));
    
    // ตรวจสอบว่า props มีค่าหรือไม่
    const isShowCalendarDefined = propShowCalendar !== undefined;
    const isSetShowCalendarFunction = typeof propSetShowCalendar === 'function';
    
    // ใช้ค่า showCalendar จาก props ถ้ามี มิฉะนั้นใช้ค่าจาก local state
    const calendarVisible = isShowCalendarDefined ? propShowCalendar : localShowCalendar;
    
    // ฟังก์ชันสำหรับเปิด/ปิดปฏิทิน
    const toggleCalendar = (value) => {
        if (isSetShowCalendarFunction) {
            propSetShowCalendar(value);
        } else {
            setLocalShowCalendar(value);
        }
    };

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setThaiDate(formatThaiDate(date));
        if (onDateSelect) {
            onDateSelect(date);
        }
        toggleCalendar(false);
    };

    return (
        <div className="bg-gradient-to-br from-[#0ab4ab]/5 via-blue-50 to-purple-50 rounded-2xl p-4 mb-3 shadow-lg">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <button
                        type="button"
                        onClick={() => toggleCalendar(!calendarVisible)}
                        className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-[#0ab4ab] to-blue-500 text-white rounded-lg hover:from-[#0ab4ab]/90 hover:to-blue-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 shadow-md text-sm"
                    >
                        {calendarVisible ? 'ซ่อนปฏิทิน' : 'เลือกวันที่'}
                    </button>
                    <div className="text-gray-700 space-y-0.5 text-center md:text-left text-sm">
                        <div className="font-medium text-[#0ab4ab]">วันที่ปัจจุบัน : {formatThaiDate(new Date())}</div>
                        <div className="text-blue-600">อัพเดทข้อมูลล่าสุด : {thaiDate}</div>
                    </div>
                </div>
            </div>

            {calendarVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all">
                        <Calendar
                            selectedDate={selectedDate}
                            onDateSelect={handleDateSelect}
                            datesWithData={datesWithData}
                            onClickOutside={() => toggleCalendar(false)}
                            variant="dashboard"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardCalendar;
