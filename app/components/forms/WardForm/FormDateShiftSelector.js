import React, { useState } from 'react';
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
    /**
     * อีเวนต์เมื่อเลือกวันที่
     * @param {Date} date - วันที่ที่เลือก
     */
    const handleDateSelect = (date) => {
        if (typeof onDateSelect === 'function') {
            onDateSelect(date);
        }
        if (typeof setShowCalendar === 'function') {
            setShowCalendar(false);
        }
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
        if (typeof setShowCalendar === 'function') {
            setShowCalendar(value);
        }
    };
    
    return (
        <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* วันที่ */}
                <div className="relative">
                    <div onClick={() => handleToggleCalendar(!showCalendar)} className="cursor-pointer">
                        <div className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} border rounded-lg p-2 flex items-center`}>
                            <span className="mr-2">📅</span>
                            <div className="flex-1 text-sm">
                                <div className="font-medium">วันที่</div>
                                <div>{thaiDate}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Calendar component */}
                    {showCalendar && (
                        <div className="absolute z-20 mt-1 w-full">
                            <Calendar
                                selectedDate={selectedDate}
                                onDateSelect={handleDateSelect}
                                onClickOutside={() => handleToggleCalendar(false)}
                                datesWithData={datesWithData}
                                variant="form"
                            />
                        </div>
                    )}
                </div>
                
                {/* กะการทำงาน */}
                <div>
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