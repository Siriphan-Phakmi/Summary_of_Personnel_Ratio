'use client';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { formatThaiDate } from '../../utils/dateUtils';

const DashboardCalendar = ({ datesWithData, onDateSelect }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateString = date.toISOString().split('T')[0];
            const dateData = datesWithData.find(d => d.date === dateString);

            if (dateData) {
                return (
                    <div className="flex justify-center items-center mt-1">
                        <div className="flex gap-1">
                            {dateData.shifts.includes('07:00-19:00') && (
                                <div className="w-2 h-2 bg-yellow-400 rounded-full" 
                                     title="เช้า-บ่าย"/>
                            )}
                            {dateData.shifts.includes('19:00-07:00') && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full"
                                     title="ดึก"/>
                            )}
                        </div>
                    </div>
                );
            }
        }
        return null;
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        if (onDateSelect) {
            onDateSelect(date);
        }
    };

    return (
        <div className="calendar-container p-4 bg-white rounded-xl shadow-lg">
            <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                tileContent={tileContent}
                className="rounded-lg border-none shadow-sm"
                formatDay={(locale, date) => date.getDate()}
            />
            <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2 justify-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span>เช้า-บ่าย (07:00-19:00)</span>
                    <div className="w-3 h-3 bg-blue-400 rounded-full ml-4"></div>
                    <span>ดึก (19:00-07:00)</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardCalendar;
