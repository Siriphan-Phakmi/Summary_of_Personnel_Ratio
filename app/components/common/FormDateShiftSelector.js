import React from 'react';
import CalendarSection from './CalendarSection';
import ShiftSelection from './ShiftSelection';

/**
 * A reusable component that combines calendar selection and shift selection
 * Can be used across different forms to maintain consistent UI
 */
const FormDateShiftSelector = ({
  selectedDate,
  onDateSelect,
  datesWithData = [],
  showCalendar,
  setShowCalendar,
  thaiDate,
  selectedShift,
  onShiftChange,
  theme = 'light',
}) => {
  return (
    <div className="space-y-4">
      {/* Calendar Section */}
      <CalendarSection
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        datesWithData={datesWithData}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
        thaiDate={thaiDate}
        theme={theme}
      />
      
      {/* Shift Selection */}
      <div className={`${
        theme === 'dark' 
          ? 'bg-gray-800/70 border border-gray-700 hover:bg-gray-700/80' 
          : 'bg-white/60 hover:shadow-md'
      } backdrop-blur-sm rounded-xl p-4 shadow-sm transition-all`}>
        <div className={`mb-2 font-medium ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-700'
        }`}>กะทำงาน <span className="text-[#0ab4ab]">*</span></div>
        <ShiftSelection 
          selectedShift={selectedShift}
          onShiftChange={onShiftChange}
          variant="form" 
          theme={theme}
        />
        <div className={`text-xs mt-2 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          การเปลี่ยนกะจะทำให้ข้อมูลที่ยังไม่ได้บันทึกหายไป กรุณาบันทึกข้อมูลก่อนเปลี่ยนกะ
        </div>
      </div>
    </div>
  );
};

export default FormDateShiftSelector; 