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
    variant = 'form',
    theme = 'light'
}) => {
    const isDark = theme === 'dark';
    const [currentDate, setCurrentDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    const [displayDate, setDisplayDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    const calendarRef = useRef(null);

    // Format date to Thai locale
    const formatThaiDate = (date) => {
        if (!(date instanceof Date) || isNaN(date)) {
            console.error('Invalid date in formatThaiDate:', date);
            return '';
        }
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
            try {
                const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
                if (!isNaN(dateObj)) {
                    setCurrentDate(dateObj);
                    if (variant !== 'form') {
                        setDisplayDate(dateObj);
                    }
                }
            } catch (err) {
                console.error('Error parsing selectedDate:', err);
            }
        }
    }, [selectedDate, variant]);

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

    const handleDateSelect = (day, isCurrentMonth) => {
        if (!isCurrentMonth) return;
        
        const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
        setCurrentDate(newDate);
        
        if (typeof onDateSelect === 'function') {
            onDateSelect(newDate);
        }
        
        if (typeof onClickOutside === 'function') {
            onClickOutside();
        }
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
        const { hasData, isComplete, shifts } = getDateStatus(date);
        const isToday = date.toDateString() === new Date().toDateString();
        
        // แปลง selectedDate เป็น Date object ก่อนเปรียบเทียบ
        let selectedDateObj = null;
        if (selectedDate) {
            try {
                selectedDateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
            } catch (err) {
                console.error('Error converting selectedDate to Date object:', err);
            }
        }
        
        const isSelected = selectedDateObj && !isNaN(selectedDateObj) && 
            date.getDate() === selectedDateObj.getDate() &&
            date.getMonth() === selectedDateObj.getMonth() &&
            date.getFullYear() === selectedDateObj.getFullYear();
        
        let baseClass = 'relative w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 text-xs';
        let bgColor = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
        let textColor = isDark ? 'text-gray-300' : 'text-gray-700';
        let dotClass = '';

        if (isToday) {
            bgColor = 'bg-[#0ab4ab]';
            textColor = 'text-white';
        }
        
        if (hasData) {
            if (isComplete) {
                bgColor = isDark ? 'bg-[#0ab4ab]/20 hover:bg-[#0ab4ab]/30' : 'bg-[#0ab4ab]/10 hover:bg-[#0ab4ab]/20';
                dotClass = 'absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-[#0ab4ab]';
            } else {
                bgColor = isDark ? 'bg-orange-800/30 hover:bg-orange-800/40' : 'bg-orange-100 hover:bg-orange-200';
                dotClass = 'absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-orange-500';
            }
        }

        if (isSelected && !isToday) {
            bgColor += ' ring-1 ring-[#0ab4ab]';
        }

        if (date < new Date(new Date().setHours(0,0,0,0))) {
            if (!isToday && !isSelected) {
                textColor = isDark ? 'text-gray-600' : 'text-gray-400';
            }
        }

        return {
            cellClass: `p-0.5 text-center`,
            dayClass: `${baseClass} ${bgColor} ${textColor} font-medium`,
            dotClass
        };
    };

    // Generate calendar grid
    const generateCalendarDays = () => {
        // ตรวจสอบว่า displayDate เป็น Date object ที่ถูกต้อง
        if (!(displayDate instanceof Date) || isNaN(displayDate)) {
            console.error('Invalid displayDate in generateCalendarDays:', displayDate);
            // ใช้วันที่ปัจจุบันแทนเมื่อ displayDate ไม่ถูกต้อง
            setDisplayDate(new Date());
            return [];
        }

        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // ตรวจสอบว่าค่าที่ได้เป็นตัวเลขที่ถูกต้อง
        if (isNaN(year) || isNaN(month) || isNaN(daysInMonth) || isNaN(startingDayOfWeek)) {
            console.error('Invalid date calculations in generateCalendarDays', {
                year, month, daysInMonth, startingDayOfWeek
            });
            return [];
        }

        // Get last month's info
        const lastMonth = new Date(year, month, 0);
        const daysInLastMonth = lastMonth.getDate();

        const weeks = [];
        let days = [];
        // Track week number for unique keys
        let weekNum = 0;

        // Add cells for days from previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const day = daysInLastMonth - startingDayOfWeek + i + 1;
            const date = new Date(year, month - 1, day);
            const { cellClass, dayClass, dotClass } = getCellStyle(date);
            
            days.push(
                <td key={`prev-${day}`} className={cellClass}>
                    <div
                        onClick={() => handleDateSelect(day, false)}
                        className={`${dayClass} opacity-50`}
                    >
                        {day}
                        {dotClass && <div className={dotClass}></div>}
                    </div>
                </td>
            );
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

            // If it's the end of the week or the end of the month, start a new row
            if ((startingDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
                // Create a unique key for each week using the year-month-weekNum format
                const rowKey = `${year}-${month}-week-${weekNum}`;
                weekNum++; // Increment week number for the next row
                
                // If it's the end of the month, add days from next month to fill the row
                if (day === daysInMonth && (startingDayOfWeek + day) % 7 !== 0) {
                    const daysLeft = 7 - ((startingDayOfWeek + day) % 7);
                    for (let i = 1; i <= daysLeft; i++) {
                        const nextMonthDay = i;
                        const date = new Date(year, month + 1, nextMonthDay);
                        const { cellClass, dayClass, dotClass } = getCellStyle(date);
                        
                        days.push(
                            <td key={`next-${i}`} className={cellClass}>
                                <div
                                    onClick={() => handleDateSelect(nextMonthDay, false)}
                                    className={`${dayClass} opacity-50`}
                                >
                                    {nextMonthDay}
                                    {dotClass && <div className={dotClass}></div>}
                                </div>
                            </td>
                        );
                    }
                }
                
                weeks.push(<tr key={rowKey}>{days}</tr>);
                days = [];
            }
        }

        return weeks;
    };

    return (
        <div 
            ref={calendarRef}
            className={`p-4 rounded-lg shadow-lg calendar-container ${isDark ? 'bg-gray-800 text-white' : 'bg-white'}`}
            style={{ minWidth: '300px' }}
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>เลือกวันที่</h2>
                <div className="flex items-center space-x-2">
                    <select 
                        value={displayDate.getMonth()} 
                        onChange={handleMonthChange}
                        className={`px-2 py-1 text-sm rounded-md ${
                            isDark 
                                ? 'bg-gray-700 text-white border-gray-600' 
                                : 'bg-white text-gray-700 border-gray-300'
                        } border outline-none focus:ring-1 focus:ring-blue-500`}
                    >
                        {months.map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                    <select 
                        value={displayDate.getFullYear()} 
                        onChange={handleYearChange}
                        className={`px-2 py-1 text-sm rounded-md ${
                            isDark 
                                ? 'bg-gray-700 text-white border-gray-600' 
                                : 'bg-white text-gray-700 border-gray-300'
                        } border outline-none focus:ring-1 focus:ring-blue-500`}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <table className="w-full">
                <thead>
                    <tr>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>อา</th>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>จ</th>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>อ</th>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>พ</th>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>พฤ</th>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ศ</th>
                        <th className={`text-center p-1 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ส</th>
                    </tr>
                </thead>
                <tbody>
                    {generateCalendarDays()}
                </tbody>
            </table>

            <div className="flex items-center justify-center mt-3 text-xs">
                <div className="flex items-center mr-4">
                    <div className="w-2 h-2 rounded-full bg-[#0ab4ab] mr-1"></div>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>วันที่มีข้อมูล</span>
                </div>
                <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>ไม่ครบ</span>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
