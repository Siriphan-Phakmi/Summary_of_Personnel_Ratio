'use client';

import React, { useState } from 'react';
import { formatThaiDate, getCurrentDate } from '../../../utils/dateUtils';
import Calendar from '../../ui/Calendar';
import { handleDateSelect, handleShiftChange } from './EventHandlers';
import AlertUtil from '../../../utils/AlertUtil';

/**
 * Component สำหรับเลือกวันที่และกะการทำงาน
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
  hasUnsavedChanges = false,
  onSaveDraft = null,
  selectedWard = '',
  setApprovalStatus = null,
  setFormData = null,
}) => {
  const isDark = theme === 'dark';
  
  // สร้าง local state สำหรับ fallback กรณีที่ไม่มี prop showCalendar
  const [localShowCalendar, setLocalShowCalendar] = useState(false);
  
  // ตรวจสอบว่า showCalendar และ setShowCalendar เป็น undefined หรือไม่
  const isShowCalendarDefined = showCalendar !== undefined;
  const isSetShowCalendarFunction = typeof setShowCalendar === 'function';
  
  // ใช้ค่า showCalendar จาก props ถ้ามี มิฉะนั้นใช้ค่าจาก local state
  const calendarVisible = isShowCalendarDefined ? showCalendar : localShowCalendar;
  
  // สร้างฟังก์ชันสำหรับเปิด/ปิดปฏิทิน
  const toggleCalendar = (value) => {
    if (isSetShowCalendarFunction) {
      setShowCalendar(value);
    } else {
      setLocalShowCalendar(value);
    }
  };
  
  // ฟังก์ชันจัดการการเลือกวันที่
  const handleDateChange = async (date) => {
    try {
      // ตรวจสอบว่ามีข้อมูลที่ยังไม่ได้บันทึกหรือไม่
      if (hasUnsavedChanges) {
          const confirmResult = await AlertUtil.confirm(
              'มีข้อมูลที่ยังไม่ได้บันทึก',
              'คุณต้องการเปลี่ยนวันที่หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกจะหายไป',
              {
                  confirmText: 'ใช่, เปลี่ยนวันที่',
                  cancelText: 'ไม่, ยกเลิก',
                  type: 'warning'
              }
          );
          
          if (!confirmResult) {
              return; // ยกเลิกการเปลี่ยนวันที่
          }
      }
      
      // ดำเนินการเปลี่ยนวันที่
      setShowCalendar(false);
      
      // ใช้ฟังก์ชันจากผู้เรียกโดยตรง ไม่ผ่าน handleDateSelect เพื่อหลีกเลี่ยงปัญหา
      if (typeof onDateSelect === 'function') {
        onDateSelect(date);
      }
    } catch (error) {
      console.error('Error handling date selection:', error);
      AlertUtil.error(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถเปลี่ยนวันที่ได้ กรุณาลองใหม่อีกครั้ง'
      );
    }
  };

  // ฟังก์ชันจัดการการเลือกกะการทำงาน
  const handleShiftSelect = async (shift) => {
    try {
      // ตรวจสอบว่ามีข้อมูลที่ยังไม่ได้บันทึกหรือไม่
      if (hasUnsavedChanges) {
          const confirmResult = await AlertUtil.confirm(
              'มีข้อมูลที่ยังไม่ได้บันทึก',
              'คุณต้องการเปลี่ยนกะการทำงานหรือไม่? ข้อมูลที่ยังไม่ได้บันทึกจะหายไป',
              {
                  confirmText: 'ใช่, เปลี่ยนกะการทำงาน',
                  cancelText: 'ไม่, ยกเลิก',
                  type: 'warning'
              }
          );
          
          if (!confirmResult) {
              return; // ยกเลิกการเปลี่ยนกะ
          }
      }
      
      // ดำเนินการเปลี่ยนกะ
      if (typeof onShiftChange === 'function') {
        onShiftChange(shift);
      }
    } catch (error) {
      console.error('Error handling shift selection:', error);
      AlertUtil.error(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถเปลี่ยนกะการทำงานได้ กรุณาลองใหม่อีกครั้ง'
      );
    }
  };

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* วันที่ */}
        <div className="relative md:col-span-6">
          <div onClick={() => toggleCalendar(!calendarVisible)} className="cursor-pointer">
            <div className={`${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} border rounded-lg p-3 flex items-center h-full shadow-sm hover:shadow transition-all`}>
              <span className="mr-3 text-blue-500">📅</span>
              <div className="flex-1">
                <div className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-0.5`}>วันที่</div>
                <div className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{thaiDate}</div>
              </div>
            </div>
          </div>
          
          {/* Calendar component */}
          {calendarVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`} style={{maxWidth: '700px'}}>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateChange}
                  onClickOutside={() => toggleCalendar(false)}
                  datesWithData={datesWithData}
                  variant="form"
                  theme={theme}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* กะการทำงาน */}
        <div className="md:col-span-6">
          <div className={`${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} border rounded-lg p-3`}>
            <div className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`}>กะการทำงาน</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShiftSelect('Morning (07:00-19:00)')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedShift === 'Morning (07:00-19:00)' 
                    ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800') 
                    : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                }`}
              >
                เช้า (07:00-19:00)
              </button>
              <button
                onClick={() => handleShiftSelect('Night (19:00-07:00)')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedShift === 'Night (19:00-07:00)' 
                    ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800') 
                    : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                }`}
              >
                ดึก (19:00-07:00)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormDateShiftSelector; 