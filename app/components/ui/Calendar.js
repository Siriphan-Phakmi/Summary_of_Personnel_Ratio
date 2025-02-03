'use client';

import { useState, useEffect, useRef } from 'react';

const Calendar = ({ selectedDate, onDateSelect, onClickOutside, datesWithData = [], selectedShift = 'all' }) => {
    const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
    const [displayDate, setDisplayDate] = useState(selectedDate || new Date());
    const [shift, setShift] = useState(selectedShift);
    const calendarRef = useRef(null);

    useEffect(() => {
        if (selectedDate) {
            setCurrentDate(selectedDate);
            setDisplayDate(selectedDate);
        }
    }, [selectedDate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                onClickOutside && onClickOutside();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClickOutside]);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const handleMonthChange = (e) => {
        const newDate = new Date(displayDate);
        newDate.setMonth(parseInt(e.target.value));
        setDisplayDate(newDate);
    };

    const handleYearChange = (e) => {
        const newDate = new Date(displayDate);
        newDate.setFullYear(parseInt(e.target.value));
        setDisplayDate(newDate);
    };

    const handleShiftChange = (newShift) => {
        setShift(newShift);
        // ส่งวันที่ปัจจุบันที่เลือกไว้พร้อมกับ shift ใหม่
        if (onDateSelect && currentDate) {
            onDateSelect(currentDate, newShift);
        }
    };

    const handleDateSelect = (day, isCurrentMonth) => {
        if (!isCurrentMonth) return;
        
        const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
        setCurrentDate(newDate);
        if (onDateSelect) {
            onDateSelect(newDate, shift);
        }
    };

    // ปรับปรุงฟังก์ชัน formatDateString เพื่อจัดการกับวันที่ให้ถูกต้อง
    const formatDateString = (date) => {
        const d = new Date(date);
        // ปรับ timezone ให้เป็น local time
        const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return localDate.toISOString().split('T')[0];
    };

    // ฟังก์ชันตรวจสอบว่าวันที่มีข้อมูลหรือไม่
    const checkHasData = (date) => {
        const dateStr = formatDateString(date);
        console.log('Checking date:', dateStr, 'Has data:', datesWithData.includes(dateStr));
        return datesWithData.includes(dateStr);
    };

    const renderCalendar = () => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        let startingDay = firstDay.getDay();
        startingDay = startingDay === 0 ? 6 : startingDay - 1;

        const days = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                isSelected: false,
                hasData: checkHasData(prevDate),
                disabled: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDateInLoop = new Date(year, month, i);
            days.push({
                day: i,
                isCurrentMonth: true,
                isSelected: currentDateInLoop.toDateString() === currentDate?.toDateString(),
                hasData: checkHasData(currentDateInLoop),
                disabled: false
            });
        }

        // Next month days
        let nextMonthDay = 1;
        while (days.length < 42) {
            const nextDate = new Date(year, month + 1, nextMonthDay);
            days.push({
                day: nextMonthDay,
                isCurrentMonth: false,
                isSelected: false,
                hasData: checkHasData(nextDate),
                disabled: false
            });
            nextMonthDay++;
        }

        return days;
    };

    // Debug: แสดงวันที่ที่มีข้อมูลในคอนโซล
    useEffect(() => {
        console.log('Available dates:', datesWithData);
    }, [datesWithData]);

    return (
        <div ref={calendarRef} className="bg-white p-4 rounded-lg shadow-lg w-[300px]">
            <div className="flex justify-between mb-4">
                <select
                    value={displayDate.getMonth()}
                    onChange={handleMonthChange}
                    className="text-sm px-2 py-1 border rounded bg-white text-gray-800"
                >
                    {months.map((month, index) => (
                        <option key={month} value={index}>
                            {month}
                        </option>
                    ))}
                </select>
                <select
                    value={displayDate.getFullYear()}
                    onChange={handleYearChange}
                    className="text-sm px-2 py-1 border rounded bg-white text-gray-800"
                >
                    {years.map(year => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-800">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {renderCalendar().map((day, index) => (
                    <button
                        key={index}
                        onClick={() => handleDateSelect(day.day, day.isCurrentMonth)}
                        disabled={day.disabled}
                        className={`
                            relative w-8 h-8 text-xs flex items-center justify-center rounded
                            ${!day.isCurrentMonth ? 'text-gray-400 bg-gray-50' : 'text-gray-800 hover:bg-gray-100'}
                            ${day.isSelected ? 'bg-[#0ab4ab] text-white hover:bg-[#0ab4ab]/80' : ''}
                            ${day.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        {day.day}
                        {day.hasData && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        )}
                    </button>
                ))}
            </div>
            <div className="mt-4 flex justify-center space-x-2">
                <button
                    onClick={() => handleShiftChange('07:00-19:00')}
                    className={`px-4 py-2 rounded-lg ${
                        shift === '07:00-19:00' 
                        ? 'bg-[#0ab4ab] text-white' 
                        : 'text-[#0ab4ab] hover:bg-[#0ab4ab]/10'
                    }`}
                >
                    Morning
                </button>
                <button
                    onClick={() => handleShiftChange('19:00-07:00')}
                    className={`px-4 py-2 rounded-lg ${
                        shift === '19:00-07:00' 
                        ? 'bg-[#0ab4ab] text-white' 
                        : 'text-[#0ab4ab] hover:bg-[#0ab4ab]/10'
                    }`}
                >
                    Night
                </button>
                <button
                    onClick={() => handleShiftChange('all')}
                    className={`px-4 py-2 rounded-lg ${
                        shift === 'all' 
                        ? 'bg-[#0ab4ab] text-white' 
                        : 'text-[#0ab4ab] hover:bg-[#0ab4ab]/10'
                    }`}
                >
                    All
                </button>
            </div>
        </div>
    );
};

export default Calendar;
