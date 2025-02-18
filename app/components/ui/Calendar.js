'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDateString, getMonths, getYearRange } from '../../utils/dateUtils';

const Calendar = ({ selectedDate, onDateSelect, onClickOutside, datesWithData = [], selectedShift = 'all', variant = 'dashboard' }) => {
    const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
    const [displayDate, setDisplayDate] = useState(selectedDate || new Date());
    const [shift, setShift] = useState(selectedShift);
    const calendarRef = useRef(null);

    useEffect(() => {
        if (variant === 'form') {
            const today = new Date();
            setDisplayDate(today);
            setCurrentDate(today);
        }
    }, [variant]);

    useEffect(() => {
        if (selectedDate) {
            setCurrentDate(selectedDate);
            if (variant !== 'form') {
                setDisplayDate(selectedDate);
            }
        }
    }, [selectedDate, variant]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                onClickOutside && onClickOutside();
            }
        };

        if (variant === 'form') {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [onClickOutside, variant]);

    const months = getMonths();
    const currentYear = new Date().getFullYear();
    const years = getYearRange(currentYear);

    const handleMonthChange = (e) => {
        const newDate = new Date(displayDate);
        newDate.setMonth(parseInt(e.target.value));
        setDisplayDate(newDate);
        if (variant === 'form') {
            const today = new Date();
            newDate.setDate(today.getDate());
            setDisplayDate(newDate);
        }
    };

    const handleYearChange = (e) => {
        const newDate = new Date(displayDate);
        newDate.setFullYear(parseInt(e.target.value));
        setDisplayDate(newDate);
        if (variant === 'form') {
            const today = new Date();
            newDate.setDate(today.getDate());
            setDisplayDate(newDate);
        }
    };

    const handleShiftChange = (newShift) => {
        setShift(newShift);
        if (onDateSelect && currentDate) {
            onDateSelect(currentDate, newShift);
        }
    };

    const handleDateSelect = (day, isCurrentMonth) => {
        if (!isCurrentMonth) return;
        
        const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
        setCurrentDate(newDate);
        
        if (variant === 'dashboard') {
            onDateSelect(newDate, shift);
        } else {
            onDateSelect(newDate);
        }
        
        onClickOutside && onClickOutside();
    };

    const checkHasData = (date) => {
        const dateStr = formatDateString(date);
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonthLastDay - i);
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                hasData: checkHasData(date)
            });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const isToday = date.getTime() === today.getTime();
            days.push({
                day: i,
                isCurrentMonth: true,
                hasData: checkHasData(date),
                isToday
            });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push({
                day: i,
                isCurrentMonth: false,
                hasData: checkHasData(date)
            });
        }

        return days.map(({ day, isCurrentMonth, hasData, isToday }, index) => (
            <button
                key={index}
                onClick={() => handleDateSelect(day, isCurrentMonth)}
                disabled={!isCurrentMonth}
                className={`
                    relative p-2 text-sm rounded-lg transition-all duration-200
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100'}
                    ${hasData ? 'bg-[#0ab4ab]/10 text-[#0ab4ab] font-medium hover:bg-[#0ab4ab]/20' : ''}
                    ${isToday ? 'ring-2 ring-green-500' : ''}
                    ${currentDate &&
                    day === currentDate.getDate() &&
                    displayDate.getMonth() === currentDate.getMonth() &&
                    displayDate.getFullYear() === currentDate.getFullYear()
                        ? 'bg-[#0ab4ab] text-white hover:bg-[#0ab4ab]/90'
                        : ''}
                `}
            >
                {day}
                {hasData && (
                    <span 
                        className={`absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse
                            ${!isCurrentMonth ? 'opacity-50' : ''}`}
                        title={`มีข้อมูล${!isCurrentMonth ? ' (เดือนอื่น)' : ''}`}
                    />
                )}
            </button>
        ));
    };

    const shiftButtons = [
        { id: 'all', label: 'All Day', value: 'all' },
        { id: 'morning', label: 'Morning', value: '07:00-19:00' },
        { id: 'night', label: 'Night', value: '19:00-07:00' }
    ];

    return (
        <div 
            ref={calendarRef} 
            className={`bg-white rounded-lg shadow-lg ${variant === 'dashboard' ? 'w-[340px]' : 'w-[340px]'}`}
        >
            <div className="p-4">
                {/* Calendar Header */}
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Select Date</h2>
                        <p className="text-sm text-gray-600">วันที่ปัจจุบัน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    {/* Year/Month Selectors */}
                    <div className="flex gap-2">
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
                </div>

                {/* Rest of the calendar */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-800">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {renderCalendar()}
                </div>
                {variant === 'dashboard' && (
                    <div className="mt-4 p-4 border-t">
                        <p className="text-sm text-gray-600 mb-2 text-center">กรุณาเลือกกะก่อนเลือกวันที่</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {shiftButtons.map(({ id, label, value }) => (
                                <button
                                    key={id}
                                    onClick={() => handleShiftChange(value)}
                                    className={`px-4 py-2 rounded-lg transition-colors
                                        ${shift === value 
                                            ? 'bg-[#0ab4ab] text-white' 
                                            : 'text-[#0ab4ab] hover:bg-[#0ab4ab]/10'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Calendar;
