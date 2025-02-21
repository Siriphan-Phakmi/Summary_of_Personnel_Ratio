'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDateString, getMonths, getYearRange } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const Calendar = ({ 
    selectedDate, 
    onDateSelect, 
    onClickOutside, 
    datesWithData = [], 
    selectedShift = 'all', 
    variant = 'dashboard',
    showFormStyle = false 
}) => {
    const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
    const [displayDate, setDisplayDate] = useState(selectedDate || new Date());
    const [shift, setShift] = useState(selectedShift);
    const calendarRef = useRef(null);

    // Format date to Thai locale
    const formatThaiDate = (date) => {
        return format(date, 'dd MMMM yyyy', { locale: th });
    };

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Function to check if a date has data
    const getDateStatus = (date) => {
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const dateStr = localDate.toISOString().split('T')[0];
        const dateData = datesWithData.find(d => d.date === dateStr);
        
        if (!dateData) return { hasData: false, isComplete: false, shifts: [] };
        
        return {
            hasData: true,
            isComplete: dateData.isComplete,
            shifts: dateData.shifts
        };
    };

    // Function to get cell style
    const getCellStyle = (date) => {
        const { hasData, isComplete } = getDateStatus(date);
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = selectedDate && 
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
        
        let baseClass = 'relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200';
        let bgColor = 'hover:bg-gray-100';
        let textColor = 'text-gray-700';
        let dotClass = '';

        if (isToday) {
            bgColor = 'bg-[#0ab4ab]';
            textColor = 'text-white';
        } else if (hasData) {
            if (isComplete) {
                bgColor = 'bg-[#0ab4ab]/10 hover:bg-[#0ab4ab]/20';
                dotClass = 'bg-[#0ab4ab]';
            } else {
                bgColor = 'bg-orange-100 hover:bg-orange-200';
                dotClass = 'bg-orange-500';
            }
        }

        if (isSelected && !isToday) {
            bgColor += ' ring-2 ring-[#0ab4ab]';
        }

        if (date < new Date(new Date().setHours(0,0,0,0))) {
            if (!isToday && !isSelected) {
                textColor = 'text-gray-400';
            }
        }

        return {
            cellClass: `p-1 text-center`,
            dayClass: `${baseClass} ${bgColor} ${textColor} font-medium cursor-pointer`,
            dotClass: dotClass && !isToday && !isSelected ? `absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${dotClass}` : ''
        };
    };

    // Generate calendar grid
    const generateCalendarDays = () => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const weeks = [];
        let days = [];

        // Add empty cells for days before the first of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<td key={`empty-${i}`} className="p-1"></td>);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const { cellClass, dayClass, dotClass } = getCellStyle(date);

            days.push(
                <td key={day} className={cellClass}>
                    <div
                        onClick={() => handleDateSelect(day, true)}
                        className={dayClass}
                    >
                        {day}
                        {dotClass && <div className={dotClass}></div>}
                    </div>
                </td>
            );

            if (days.length === 7) {
                weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
                days = [];
            }
        }

        // Add remaining days
        if (days.length > 0) {
            while (days.length < 7) {
                days.push(<td key={`empty-end-${days.length}`} className="p-1"></td>);
            }
            weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
        }

        return weeks;
    };

    // Legend component
    const Legend = () => (
        <div className="flex justify-center gap-4 text-sm text-gray-600 border-t pt-4">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0ab4ab]"></div>
                <span>วันที่ปัจจุบัน</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0ab4ab]/10 border border-[#0ab4ab]/20"></div>
                <span>บันทึกครบ 2 กะ</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-100 border border-orange-200"></div>
                <span>บันทึกไม่ครบ</span>
            </div>
        </div>
    );

    return (
        <div 
            ref={calendarRef} 
            className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
        >
            <div className="p-4">
                {/* Calendar Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">เลือกวันที่</h2>
                        <p className="text-sm text-gray-600">วันที่ปัจจุบัน: {formatThaiDate(new Date())}</p>
                    </div>
                    {/* Year/Month Selectors */}
                    <div className="flex gap-2">
                        <select
                            value={displayDate.getMonth()}
                            onChange={handleMonthChange}
                            className="text-sm px-3 py-1.5 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent"
                        >
                            {months.map((month, index) => (
                                <option key={month} value={index}>{month}</option>
                            ))}
                        </select>
                        <select
                            value={displayDate.getFullYear()}
                            onChange={handleYearChange}
                            className="text-sm px-3 py-1.5 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="mb-4">
                    <table className="w-full">
                        <thead>
                            <tr>
                                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                                    <th key={day} className="p-1 text-sm font-medium text-gray-600">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>{generateCalendarDays()}</tbody>
                    </table>
                </div>

                {/* Legend - แสดงเฉพาะ 3 สถานะ */}
                <Legend />

                {/* Shift Selector for Dashboard */}
                {variant === 'dashboard' && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600 mb-3 text-center">กรุณาเลือกกะก่อนเลือกวันที่</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                { id: 'all', label: 'ทั้งวัน', value: 'all' },
                                { id: 'morning', label: 'กะเช้า', value: '07:00-19:00' },
                                { id: 'night', label: 'กะดึก', value: '19:00-07:00' }
                            ].map(({ id, label, value }) => (
                                <button
                                    key={id}
                                    onClick={() => handleShiftChange(value)}
                                    className={`px-4 py-2 rounded-lg transition-all duration-200
                                        ${shift === value 
                                            ? 'bg-[#0ab4ab] text-white shadow-md' 
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
