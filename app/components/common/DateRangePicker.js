'use client';

import React, { useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { th } from 'date-fns/locale';
import { FaCalendarAlt } from 'react-icons/fa';

/**
 * DateRangePicker Component
 * คอมโพเนนต์สำหรับเลือกช่วงวันที่
 * 
 * @param {Object} props
 * @param {string} props.startDate - วันที่เริ่มต้นในรูปแบบ 'yyyy-MM-dd'
 * @param {string} props.endDate - วันที่สิ้นสุดในรูปแบบ 'yyyy-MM-dd'
 * @param {Function} props.onDatesChange - ฟังก์ชันที่จะเรียกเมื่อมีการเปลี่ยนแปลงวันที่
 */
const DateRangePicker = ({ startDate, endDate, onDatesChange }) => {
    const [startInputValue, setStartInputValue] = useState(startDate || '');
    const [endInputValue, setEndInputValue] = useState(endDate || '');
    const [error, setError] = useState(null);
    
    /**
     * จัดการการเปลี่ยนแปลงวันที่เริ่มต้น
     * @param {Event} e - เหตุการณ์การเปลี่ยนแปลง
     */
    const handleStartDateChange = (e) => {
        const value = e.target.value;
        setStartInputValue(value);
        
        // ตรวจสอบความถูกต้องของวันที่
        if (value) {
            const date = parse(value, 'yyyy-MM-dd', new Date());
            
            if (!isValid(date)) {
                setError('วันที่เริ่มต้นไม่ถูกต้อง');
                return;
            }
            
            // ตรวจสอบว่าวันที่เริ่มต้นมาก่อนวันที่สิ้นสุดหรือไม่
            if (endInputValue) {
                const endDate = parse(endInputValue, 'yyyy-MM-dd', new Date());
                if (isValid(endDate) && date > endDate) {
                    setError('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด');
                    return;
                }
            }
        }
        
        setError(null);
        
        // เรียกใช้ฟังก์ชัน callback เมื่อทั้งสองวันที่ถูกต้อง
        if (value && endInputValue) {
            onDatesChange({
                start: value,
                end: endInputValue
            });
        }
    };
    
    /**
     * จัดการการเปลี่ยนแปลงวันที่สิ้นสุด
     * @param {Event} e - เหตุการณ์การเปลี่ยนแปลง
     */
    const handleEndDateChange = (e) => {
        const value = e.target.value;
        setEndInputValue(value);
        
        // ตรวจสอบความถูกต้องของวันที่
        if (value) {
            const date = parse(value, 'yyyy-MM-dd', new Date());
            
            if (!isValid(date)) {
                setError('วันที่สิ้นสุดไม่ถูกต้อง');
                return;
            }
            
            // ตรวจสอบว่าวันที่สิ้นสุดมาหลังวันที่เริ่มต้นหรือไม่
            if (startInputValue) {
                const startDate = parse(startInputValue, 'yyyy-MM-dd', new Date());
                if (isValid(startDate) && date < startDate) {
                    setError('วันที่สิ้นสุดต้องมาหลังวันที่เริ่มต้น');
                    return;
                }
            }
        }
        
        setError(null);
        
        // เรียกใช้ฟังก์ชัน callback เมื่อทั้งสองวันที่ถูกต้อง
        if (startInputValue && value) {
            onDatesChange({
                start: startInputValue,
                end: value
            });
        }
    };
    
    /**
     * จัดการการยืนยันช่วงวันที่
     */
    const handleApply = () => {
        if (startInputValue && endInputValue) {
            const startDate = parse(startInputValue, 'yyyy-MM-dd', new Date());
            const endDate = parse(endInputValue, 'yyyy-MM-dd', new Date());
            
            if (!isValid(startDate)) {
                setError('วันที่เริ่มต้นไม่ถูกต้อง');
                return;
            }
            
            if (!isValid(endDate)) {
                setError('วันที่สิ้นสุดไม่ถูกต้อง');
                return;
            }
            
            if (startDate > endDate) {
                setError('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด');
                return;
            }
            
            setError(null);
            onDatesChange({
                start: startInputValue,
                end: endInputValue
            });
        } else {
            setError('โปรดระบุทั้งวันที่เริ่มต้นและวันที่สิ้นสุด');
        }
    };
    
    /**
     * จัดรูปแบบวันที่สำหรับแสดงผล
     * @param {string} dateString - วันที่ในรูปแบบ 'yyyy-MM-dd'
     * @returns {string} - วันที่ในรูปแบบที่อ่านง่าย
     */
    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        
        try {
            const date = parse(dateString, 'yyyy-MM-dd', new Date());
            return isValid(date) ? format(date, 'dd MMM yyyy', { locale: th }) : dateString;
        } catch (error) {
            return dateString;
        }
    };
    
    return (
        <div className="relative">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                        type="date"
                        id="start-date"
                        value={startInputValue}
                        onChange={handleStartDateChange}
                        className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        placeholder="วันที่เริ่มต้น"
                        max={endInputValue || undefined}
                    />
                </div>
                
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                        type="date"
                        id="end-date"
                        value={endInputValue}
                        onChange={handleEndDateChange}
                        className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        placeholder="วันที่สิ้นสุด"
                        min={startInputValue || undefined}
                    />
                </div>
                
                <button
                    type="button"
                    onClick={handleApply}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    ตกลง
                </button>
            </div>
            
            {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}
            
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {startInputValue && endInputValue ? (
                    <span>
                        {formatDisplayDate(startInputValue)} - {formatDisplayDate(endInputValue)}
                    </span>
                ) : (
                    <span>โปรดเลือกช่วงวันที่</span>
                )}
            </div>
        </div>
    );
};

export default DateRangePicker; 