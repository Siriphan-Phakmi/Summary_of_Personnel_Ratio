import React, { useState, useEffect, useMemo } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parseISO, addDays, isAfter, isBefore, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import type { ModifiersStyles } from 'react-day-picker';

export type CalendarMarker = { date: string; status: 'draft' | 'final' | 'approved' };

interface CalendarWithMarkersProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
  markers: CalendarMarker[];
}

type ViewMode = 'day' | 'week' | 'month';

const CalendarWithMarkers: React.FC<CalendarWithMarkersProps> = ({ 
  startDate, 
  endDate, 
  onDateChange, 
  markers 
}) => {
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseISO(startDate),
    to: parseISO(endDate)
  });
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(parseISO(startDate));

  // แปลงรายการ markers เป็นวันที่ตามสถานะ
  const draftDates = markers.filter(m => m.status === 'draft').map(m => parseISO(m.date));
  const finalDates = markers.filter(m => m.status === 'final').map(m => parseISO(m.date));
  const approvedDates = markers.filter(m => m.status === 'approved').map(m => parseISO(m.date));

  // ใช้ Effect เพื่ออัพเดท range เมื่อ props เปลี่ยน
  useEffect(() => {
    setRange({
      from: parseISO(startDate),
      to: parseISO(endDate)
    });
    setCurrentMonth(parseISO(startDate));
  }, [startDate, endDate]);

  // เมื่อเลือกช่วงวันที่เสร็จ ส่งกลับไปที่ parent component
  useEffect(() => {
    if (range?.from && range?.to) {
      const formattedFrom = format(range.from, 'yyyy-MM-dd');
      const formattedTo = format(range.to, 'yyyy-MM-dd');
      
      // เรียก callback และส่งข้อมูลช่วงวันที่
      onDateChange(formattedFrom, formattedTo);
    }
  }, [range, onDateChange]);

  // ใส่ CSS ที่จำเป็นสำหรับปฏิทิน (ใส่เข้าไปตรงๆ แทนที่จะใช้ไฟล์ CSS)
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Calendar Container */
      .calendar-wrapper {
        width: 100%;
        max-width: 800px;
        display: flex;
        flex-direction: column;
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        font-family: var(--font-family);
        color: var(--text-color);
        overflow: hidden;
        margin: 0 auto;
      }
      
      .dark .calendar-wrapper {
        background-color: #1e293b;
        color: #f9fafb;
      }
      
      /* Calendar Header */
      .calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
      }
      
      .month-selector {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .current-month-label {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        color: #111827;
      }
      
      .dark .current-month-label {
        color: #f9fafb;
      }
      
      .month-nav-buttons {
        display: flex;
        gap: 0.25rem;
      }
      
      .month-nav-button {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: transparent;
        border: none;
        color: #4f46e5;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
        transition: all 0.2s;
      }
      
      .month-nav-button:hover {
        background-color: #eef2ff;
      }
      
      .dark .month-nav-button {
        color: #6366f1;
      }
      
      .dark .month-nav-button:hover {
        background-color: #334155;
      }
      
      .today-button {
        background-color: #eef2ff;
        color: #4f46e5;
        border: none;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .today-button:hover {
        background-color: #4f46e5;
        color: white;
      }
      
      .dark .today-button {
        background-color: #334155;
        color: #6366f1;
      }
      
      .dark .today-button:hover {
        background-color: #6366f1;
        color: white;
      }
      
      .view-mode-container {
        display: flex;
        background-color: #eef2ff;
        padding: 0.2rem;
        border-radius: 0.375rem;
        gap: 1px;
        font-size: 0.75rem;
      }
      
      .dark .view-mode-container {
        background-color: #334155;
      }
      
      .view-mode-button {
        padding: 0.375rem 0.75rem;
        background-color: #eef2ff;
        color: #4f46e5;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .view-mode-button:hover {
        background-color: rgba(79, 70, 229, 0.1);
      }
      
      .view-mode-button.active {
        background-color: #4f46e5;
        color: white;
      }
      
      .dark .view-mode-button {
        background-color: #334155;
        color: #6366f1;
      }
      
      .dark .view-mode-button:hover {
        background-color: rgba(99, 102, 241, 0.1);
      }
      
      .dark .view-mode-button.active {
        background-color: #6366f1;
        color: white;
      }
      
      /* Calendar Grid */
      .calendar-grid {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
      }
      
      .dark .calendar-grid {
        border-color: #334155;
      }
      
      .calendar-days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        overflow: hidden;
      }
      
      .calendar-day-header {
        padding: 0.5rem;
        background-color: #eef2ff;
        border-right: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
        font-size: 0.75rem;
        font-weight: 500;
        color: #4f46e5;
        text-align: center;
      }
      
      .calendar-day-header:last-child {
        border-right: none;
      }
      
      .dark .calendar-day-header {
        background-color: #1e293b;
        border-color: #334155;
        color: #6366f1;
      }
      
      .calendar-weeks {
        display: grid;
        grid-template-rows: repeat(6, 1fr);
      }
      
      .calendar-week {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
      }
      
      .calendar-day-cell {
        aspect-ratio: 1/1;
        padding: 0.5rem;
        border-right: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
        background-color: white;
        position: relative;
        cursor: pointer;
        transition: all 0.2s;
        height: 60px;
      }
      
      .calendar-day-cell:last-child {
        border-right: none;
      }
      
      .calendar-week:last-child .calendar-day-cell {
        border-bottom: none;
      }
      
      .calendar-day-cell:hover {
        background-color: #eef2ff;
      }
      
      .calendar-day-cell.outside-month {
        background-color: #f9fafb;
      }
      
      .dark .calendar-day-cell {
        background-color: #1e293b;
        border-color: #334155;
      }
      
      .dark .calendar-day-cell:hover {
        background-color: #334155;
      }
      
      .dark .calendar-day-cell.outside-month {
        background-color: #0f172a;
      }
      
      .calendar-day-number {
        font-size: 0.7rem;
        font-weight: 600;
        color: #111827;
      }
      
      .calendar-day-number.outside-month {
        color: #9ca3af;
      }
      
      .dark .calendar-day-number {
        color: #f9fafb;
      }
      
      .dark .calendar-day-number.outside-month {
        color: #6b7280;
      }
      
      .calendar-day-number.today {
        background-color: #4f46e5;
        color: white;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      
      .dark .calendar-day-number.today {
        background-color: #6366f1;
      }
      
      .calendar-day-number.selected {
        background-color: #4f46e5;
        color: white;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      
      .dark .calendar-day-number.selected {
        background-color: #6366f1;
      }
      
      .calendar-day-cell.range-middle {
        background-color: #eef2ff;
      }
      
      .dark .calendar-day-cell.range-middle {
        background-color: rgba(99, 102, 241, 0.1);
      }
      
      /* Event Markers */
      .event-marker {
        position: absolute;
        bottom: 0.75rem;
        left: 0.875rem;
        right: 0.875rem;
        padding: 0.375rem 0.625rem;
        border-radius: 0.25rem;
        overflow: hidden;
        max-height: calc(100% - 2rem);
      }
      
      .event-marker.draft {
        background-color: #e0e7ff;
      }
      
      .event-marker.final {
        background-color: #dcfce7;
      }
      
      .event-marker.approved {
        background-color: #dbeafe;
      }
      
      .dark .event-marker.draft {
        background-color: rgba(99, 102, 241, 0.2);
      }
      
      .dark .event-marker.final {
        background-color: rgba(16, 185, 129, 0.2);
      }
      
      .dark .event-marker.approved {
        background-color: rgba(59, 130, 246, 0.2);
      }
      
      .event-title {
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.125rem;
      }
      
      .event-time {
        font-size: 0.75rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .event-marker.draft .event-title,
      .event-marker.draft .event-time {
        color: #4f46e5;
      }
      
      .event-marker.final .event-title,
      .event-marker.final .event-time {
        color: #10b981;
      }
      
      .event-marker.approved .event-title,
      .event-marker.approved .event-time {
        color: #3b82f6;
      }
      
      .dark .event-marker.draft .event-title,
      .dark .event-marker.draft .event-time {
        color: #818cf8;
      }
      
      .dark .event-marker.final .event-title,
      .dark .event-marker.final .event-time {
        color: #34d399;
      }
      
      .dark .event-marker.approved .event-title,
      .dark .event-marker.approved .event-time {
        color: #60a5fa;
      }
      
      /* Mobile Markers */
      .event-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
      }
      
      .event-dot.draft {
        background-color: #4f46e5;
      }
      
      .event-dot.final {
        background-color: #10b981;
      }
      
      .event-dot.approved {
        background-color: #3b82f6;
      }
      
      .dark .event-dot.draft {
        background-color: #818cf8;
      }
      
      .dark .event-dot.final {
        background-color: #34d399;
      }
      
      .dark .event-dot.approved {
        background-color: #60a5fa;
      }
      
      /* Calendar Footer */
      .calendar-footer {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      
      .date-range-display {
        font-size: 0.875rem;
        color: #111827;
        font-weight: 500;
      }
      
      .dark .date-range-display {
        color: #f9fafb;
      }
      
      .date-count {
        font-size: 0.75rem;
        color: #6b7280;
      }
      
      .dark .date-count {
        color: #94a3b8;
      }
      
      .status-legend {
        display: flex;
        gap: 1rem;
        margin-top: 0.75rem;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }
      
      .legend-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
      }
      
      .legend-dot.draft {
        background-color: #4f46e5;
      }
      
      .legend-dot.final {
        background-color: #10b981;
      }
      
      .legend-dot.approved {
        background-color: #3b82f6;
      }
      
      .dark .legend-dot.draft {
        background-color: #818cf8;
      }
      
      .dark .legend-dot.final {
        background-color: #34d399;
      }
      
      .dark .legend-dot.approved {
        background-color: #60a5fa;
      }
      
      .legend-text {
        font-size: 0.75rem;
        color: #6b7280;
      }
      
      .dark .legend-text {
        color: #94a3b8;
      }
      
      /* Week View */
      .week-view {
        padding: 1.25rem;
      }
      
      .week-days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        margin-bottom: 0.5rem;
      }
      
      .week-day-header {
        text-align: center;
        font-size: 0.875rem;
        font-weight: 500;
        color: #4f46e5;
        padding: 0.5rem 0;
      }
      
      .dark .week-day-header {
        color: #6366f1;
      }
      
      .week-day-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.25rem;
      }
      
      .week-day-cell {
        border: 1px solid #e5e7eb;
        padding: 0.75rem;
        min-height: 5rem;
        border-radius: 0.5rem;
      }
      
      .dark .week-day-cell {
        border-color: #334155;
      }
      
      .week-day-cell.today {
        border-left: 2px solid #4f46e5;
      }
      
      .dark .week-day-cell.today {
        border-left: 2px solid #6366f1;
      }
      
      /* Day View */
      .day-view {
        padding: 1.25rem;
        text-align: center;
      }
      
      .day-header {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 1rem;
      }
      
      .dark .day-header {
        color: #f9fafb;
      }
      
      .day-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
      }
      
      .day-status-dot {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 50%;
      }
      
      .day-status-text {
        font-size: 0.875rem;
        font-weight: 500;
        color: #111827;
      }
      
      .dark .day-status-text {
        color: #f9fafb;
      }
      
      .day-status-dot.draft, .day-status-text.draft {
        background-color: #4f46e5;
        color: #4f46e5;
      }
      
      .day-status-dot.final, .day-status-text.final {
        background-color: #10b981;
        color: #10b981;
      }
      
      .day-status-dot.approved, .day-status-text.approved {
        background-color: #3b82f6;
        color: #3b82f6;
      }
      
      .dark .day-status-dot.draft, .dark .day-status-text.draft {
        background-color: #818cf8;
        color: #818cf8;
      }
      
      .dark .day-status-dot.final, .dark .day-status-text.final {
        background-color: #34d399;
        color: #34d399;
      }
      
      .dark .day-status-dot.approved, .dark .day-status-text.approved {
        background-color: #60a5fa;
        color: #60a5fa;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // เมื่อมีการเปลี่ยนช่วงวันที่
  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      // ถ้าเลือกวันแรกแล้ว แต่ยังไม่ได้เลือกวันสุดท้าย
      if (!range.to) {
        range.to = range.from;
      }
      setRange(range);
    } else {
      setRange(undefined);
    }
  };

  // จัดการกับ hover
  const handleDayMouseEnter = (date: Date) => {
    setHoveredDay(date);
  };

  const handleDayMouseLeave = () => {
    setHoveredDay(null);
  };

  // เปลี่ยนไปวันปัจจุบัน
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setRange({
      from: today,
      to: today
    });
  };

  // สร้างรายการวันในสัปดาห์
  const weekDays = useMemo(() => {
    if (!range?.from) return [];
    
    const days = [];
    const startOfTheWeek = startOfWeek(range.from, { locale: th });
    
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startOfTheWeek, i));
    }
    
    return days;
  }, [range?.from]);

  // สร้าง Calendar View แบบ Month
  const renderMonthView = () => {
    // คำนวณวันแรกของเดือนที่แสดง
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // คำนวณวันสุดท้ายของเดือนที่แสดง
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // คำนวณวันแรกที่จะแสดงใน grid (อาจเป็นวันในเดือนก่อนหน้า)
    const startDate = startOfWeek(firstDayOfMonth, { locale: th });
    
    // สร้างรายการวันทั้งหมดที่จะแสดงใน grid
    const daysInGrid = [];
    let currentDay = startDate;
    
    // สร้าง grid จำนวน 6 สัปดาห์ (42 วัน) เพื่อให้ครอบคลุมเดือนต่างๆ ได้ทั้งหมด
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(currentDay));
        currentDay = addDays(currentDay, 1);
      }
      
      daysInGrid.push(weekDays);
    }
    
    return (
      <div className="calendar-grid">
        <div className="calendar-days-header">
          <div className="calendar-day-header">อา</div>
          <div className="calendar-day-header">จ</div>
          <div className="calendar-day-header">อ</div>
          <div className="calendar-day-header">พ</div>
          <div className="calendar-day-header">พฤ</div>
          <div className="calendar-day-header">ศ</div>
          <div className="calendar-day-header">ส</div>
        </div>
        
        <div className="calendar-weeks">
          {daysInGrid.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="calendar-week">
              {week.map((day, dayIndex) => {
                const dateString = format(day, 'yyyy-MM-dd');
                const marker = markers.find(m => m.date === dateString);
                const isOutsideMonth = day.getMonth() !== currentMonth.getMonth();
                const isToday = isSameDay(day, new Date());
                const isSelected = range?.from && range?.to ? (
                  isSameDay(day, range.from) || 
                  isSameDay(day, range.to) || 
                  (isAfter(day, range.from) && isBefore(day, range.to))
                ) : false;
                const isRangeStart = range?.from ? isSameDay(day, range.from) : false;
                const isRangeEnd = range?.to ? isSameDay(day, range.to) : false;
                const isRangeMiddle = isSelected && !isRangeStart && !isRangeEnd;
                
                return (
                  <div 
                    key={`day-${dayIndex}`}
                    className={`calendar-day-cell ${
                      isOutsideMonth ? 'outside-month' : ''
                    } ${
                      isRangeMiddle ? 'range-middle' : ''
                    }`}
                    onClick={() => {
                      // เลือกวันใหม่อย่างปลอดภัย
                      if (range?.from && range?.to) {
                        if (isRangeStart && !isSameDay(range.from, range.to)) {
                          // กรณีคลิกที่จุดเริ่มต้นของช่วงเวลา - รีเซ็ตเป็นวันเดียว
                          handleRangeSelect({ from: day, to: day });
                        } else if (isAfter(day, range.from)) {
                          // วันที่คลิกอยู่หลังวันเริ่มต้น
                          handleRangeSelect({ from: range.from, to: day });
                        } else if (isBefore(day, range.from)) {
                          // วันที่คลิกอยู่ก่อนวันเริ่มต้น
                          handleRangeSelect({ from: day, to: range.to });
                        } else {
                          // คลิกวันเดียวกับวันเริ่มต้น
                          handleRangeSelect({ from: day, to: day });
                        }
                      } else {
                        // ยังไม่มีช่วงเวลาที่เลือกไว้
                        handleRangeSelect({ from: day, to: day });
                      }
                    }}
                  >
                    <div 
                      className={`calendar-day-number ${
                        isOutsideMonth ? 'outside-month' : ''
                      } ${
                        isToday ? 'today' : ''
                      } ${
                        isRangeStart || isRangeEnd ? 'selected' : ''
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    
                    {marker && (
                      <div className={`event-marker ${marker.status}`}>
                        <div className="event-title hidden xl:block">
                          {marker.status === 'draft' ? 'ร่าง' : 
                           marker.status === 'final' ? 'ส่งแล้ว' : 
                           'อนุมัติแล้ว'}
                        </div>
                        <div className={`event-dot xl:hidden ${marker.status}`}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // สร้าง Week View
  const renderWeekView = () => {
    if (!range?.from) return null;
    
    return (
      <div className="week-view">
        <div className="week-days-header">
          {weekDays.map((day, index) => (
            <div key={`week-header-${index}`} className="week-day-header">
              {format(day, 'EEE d', { locale: th })}
            </div>
          ))}
        </div>
        
        <div className="week-day-grid">
          {weekDays.map((day, index) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const marker = markers.find(m => m.date === dateString);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={`week-cell-${index}`}
                className={`week-day-cell ${isToday ? 'today' : ''}`}
                onClick={() => handleRangeSelect({ from: day, to: day })}
              >
                {marker && (
                  <div className={`event-marker ${marker.status}`}>
                    <div className="event-title">
                      {marker.status === 'draft' ? 'ร่าง' : 
                       marker.status === 'final' ? 'ส่งแล้ว' : 
                       'อนุมัติแล้ว'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // สร้าง Day View
  const renderDayView = () => {
    if (!range?.from) return null;
    
    const selectedDate = range.from;
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const marker = markers.find(m => m.date === dateString);
    
    return (
      <div className="day-view">
        <div className="day-header">
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: th })}
        </div>
        
        {marker ? (
          <div className="day-status">
            <div className={`day-status-dot ${marker.status}`}></div>
            <div className={`day-status-text ${marker.status}`}>
              สถานะ: {marker.status === 'draft' ? 'ร่าง' : 
                      marker.status === 'final' ? 'ส่งแล้ว' : 
                      'อนุมัติแล้ว'}
            </div>
          </div>
        ) : (
          <div>ไม่มีข้อมูลในวันที่เลือก</div>
        )}
      </div>
    );
  };

  // เลือก View ที่ต้องการแสดง
  const renderView = () => {
    switch (viewMode) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
      default:
        return renderMonthView();
    }
  };

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <div className="month-selector">
          <h5 className="current-month-label">
            {format(currentMonth, 'MMMM yyyy', { locale: th })}
          </h5>
          <div className="month-nav-buttons">
            <button 
              className="month-nav-button prev-month"
              onClick={() => setCurrentMonth(prev => addDays(prev, -30))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10.0002 11.9999L6 7.99971L10.0025 3.99719" stroke="currentcolor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
            <button 
              className="month-nav-button next-month"
              onClick={() => setCurrentMonth(prev => addDays(prev, 30))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentcolor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <button 
          className="today-button"
          onClick={goToToday}
        >
          วันนี้
        </button>
        
        <div className="view-mode-container">
          <button 
            className={`view-mode-button ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            วัน
          </button>
          <button 
            className={`view-mode-button ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            สัปดาห์
          </button>
          <button 
            className={`view-mode-button ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            เดือน
          </button>
        </div>
      </div>
      
      {renderView()}
      
      <div className="calendar-footer">
        <div className="date-range-display">
          ช่วงวันที่: {range?.from ? format(range.from, 'd MMM yyyy', { locale: th }) : ''} 
          {range?.to && range?.from && !isSameDay(range.from, range.to) && ` - ${format(range.to, 'd MMM yyyy', { locale: th })}`}
        </div>
        
        <div className="date-count">
          {(range?.from && range?.to) ? 
            `${Math.floor((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} วัน` : 
            '0 วัน'}
        </div>
        
        <div className="status-legend">
          <div className="legend-item">
            <div className="legend-dot draft"></div>
            <span className="legend-text">ร่าง</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-dot final"></div>
            <span className="legend-text">ส่งแล้ว</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-dot approved"></div>
            <span className="legend-text">อนุมัติแล้ว</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWithMarkers;
