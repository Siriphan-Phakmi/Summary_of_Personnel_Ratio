import { useState, useEffect } from 'react';
import CalendarSection from '../../common/CalendarSection';
import { getCurrentDate, getCurrentShift, formatDateForDisplay, parseDate } from '../../../utils/dateHelpers';
import ShiftSelector from '../../common/ShiftSelector';
import { motion } from 'framer-motion';
import { formatThaiDate } from '../../../utils/dateUtils';

// Dynamic Shift Selector for WardForm and ShiftForm components
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
    // สร้าง local state สำหรับใช้ในกรณีที่ไม่ได้รับ props มา
    const [localShowCalendar, setLocalShowCalendar] = useState(false);
    const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate || getCurrentDate());
    const [localSelectedShift, setLocalSelectedShift] = useState(selectedShift || getCurrentShift());
    
    // ใช้ props ถ้ามี ไม่มีก็ใช้ local state
    const calendarVisible = showCalendar !== undefined ? showCalendar : localShowCalendar;
    const displayDate = selectedDate || localSelectedDate;
    const displayShift = selectedShift || localSelectedShift;
    
    // สร้างฟังก์ชัน handler ที่ปลอดภัย
    const handleDateSelect = (date) => {
        if (typeof onDateSelect === 'function') {
            onDateSelect(date);
        } else {
            console.warn('onDateSelect is not provided as a function in FormDateShiftSelector');
            setLocalSelectedDate(date);
        }
        
        // ปิดปฏิทินหลังจากเลือกวันที่
        if (typeof setShowCalendar === 'function') {
            setShowCalendar(false);
        } else {
            setLocalShowCalendar(false);
        }
    };
    
    const handleShiftChange = (shift) => {
        if (typeof onShiftChange === 'function') {
            onShiftChange(shift);
        } else {
            console.warn('onShiftChange is not provided as a function in FormDateShiftSelector');
            setLocalSelectedShift(shift);
        }
    };
    
    const handleToggleCalendar = (value) => {
        if (typeof setShowCalendar === 'function') {
            setShowCalendar(value);
        } else {
            setLocalShowCalendar(value);
        }
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 space-y-3"
        >
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <CalendarSection
                        selectedDate={displayDate}
                        onDateSelect={handleDateSelect}
                        datesWithData={datesWithData}
                        showCalendar={calendarVisible}
                        setShowCalendar={handleToggleCalendar}
                        thaiDate={thaiDate}
                        theme={theme}
                    />
                </div>
                <div className="flex-1 lg:flex-none lg:w-52">
                    <ShiftSelector
                        selected={displayShift}
                        onChange={handleShiftChange}
                        theme={theme}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default FormDateShiftSelector; 