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
    variant = 'form'
}) => {
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

        const preventDefault = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Get scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        // Save current body styles
        const originalStyles = {
            overflow: window.getComputedStyle(document.body).overflow,
            paddingRight: window.getComputedStyle(document.body).paddingRight
        };

        // Prevent all types of scrolling
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('wheel', preventDefault, { passive: false });
        document.addEventListener('touchmove', preventDefault, { passive: false });
        document.addEventListener('scroll', preventDefault, { passive: false });
        
        // Disable body scroll and compensate for scrollbar
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('wheel', preventDefault);
            document.removeEventListener('touchmove', preventDefault);
            document.removeEventListener('scroll', preventDefault);
            
            // Restore original body styles
            document.body.style.overflow = originalStyles.overflow;
            document.body.style.paddingRight = originalStyles.paddingRight;
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
        let bgColor = 'hover:bg-gray-100';
        let textColor = 'text-gray-700';
        let dotClass = '';

        if (isToday) {
            bgColor = 'bg-[#0ab4ab]';
            textColor = 'text-white';
        }
        
        if (hasData) {
            if (isComplete) {
                bgColor = 'bg-[#0ab4ab]/10 hover:bg-[#0ab4ab]/20';
                dotClass = 'absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-[#0ab4ab]';
            } else {
                bgColor = 'bg-orange-100 hover:bg-orange-200';
                dotClass = 'absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-orange-500';
            }
        }

        if (isSelected && !isToday) {
            bgColor += ' ring-1 ring-[#0ab4ab]';
        }

        if (date < new Date(new Date().setHours(0,0,0,0))) {
            if (!isToday && !isSelected) {
                textColor = 'text-gray-400';
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

            if (days.length === 7) {
                weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
                days = [];
            }
        }

        // Add cells for days from next month
        if (days.length > 0) {
            let nextMonthDay = 1;
            while (days.length < 7) {
                const date = new Date(year, month + 1, nextMonthDay);
                const { cellClass, dayClass, dotClass } = getCellStyle(date);
                
                days.push(
                    <td key={`next-${nextMonthDay}`} className={cellClass}>
                        <div
                            onClick={() => handleDateSelect(nextMonthDay, false)}
                            className={`${dayClass} opacity-50`}
                        >
                            {nextMonthDay}
                            {dotClass && <div className={dotClass}></div>}
                        </div>
                    </td>
                );
                nextMonthDay++;
            }
            weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
        }

        return weeks;
    };

    return (
        <div 
            ref={calendarRef} 
            className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 z-[9999] w-[280px]"
            onTouchMove={(e) => e.preventDefault()}
            onScroll={(e) => e.preventDefault()}
        >
            <div className="p-2">
                <div className="text-center mb-2">
                    <div className="text-sm font-medium mb-0.5">เลือกวันที่</div>
                    <div className="text-xs text-gray-600">วันที่ปัจจุบัน: {formatThaiDate(new Date())}</div>
                </div>

                <div className="flex justify-center gap-1 mb-2">
                    <select
                        value={displayDate.getMonth()}
                        onChange={handleMonthChange}
                        className="px-2 py-0.5 border rounded text-xs text-gray-700"
                    >
                        {months.map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                    <select
                        value={displayDate.getFullYear()}
                        onChange={handleYearChange}
                        className="px-2 py-0.5 border rounded text-xs text-gray-700"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                        <div key={day} className="text-[10px] font-medium text-gray-600">{day}</div>
                    ))}
                </div>

                <table className="w-full">
                    <tbody>
                        {generateCalendarDays()}
                    </tbody>
                </table>

                <div className="mt-2 flex justify-center gap-2 text-[10px]">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0ab4ab]"></div>
                        <span className="text-gray-600">วันนี้</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-gray-600">ครบ 2 กะ</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-300"></div>
                        <span className="text-gray-600">ไม่ครบ</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
