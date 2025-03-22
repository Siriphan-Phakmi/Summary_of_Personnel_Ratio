'use client';

import React from 'react';

/**
 * Select Component
 * คอมโพเนนต์สำหรับเลือกข้อมูลจากรายการ
 * 
 * @param {Object} props
 * @param {string} props.id - ID ของคอมโพเนนต์
 * @param {Array} props.options - รายการตัวเลือก [{ value, label }]
 * @param {string|number} props.value - ค่าที่เลือก
 * @param {Function} props.onChange - ฟังก์ชันที่จะเรียกเมื่อมีการเปลี่ยนแปลงค่า
 * @param {boolean} props.disabled - สถานะการปิดใช้งาน
 * @param {string} props.placeholder - ข้อความที่แสดงเมื่อไม่มีการเลือกค่า
 * @param {string} props.className - คลาสเพิ่มเติมสำหรับคอมโพเนนต์
 */
const Select = ({
    id,
    options = [],
    value,
    onChange,
    disabled = false,
    placeholder = 'เลือกรายการ',
    className = '',
    ...rest
}) => {
    return (
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${className}`}
            {...rest}
        >
            {placeholder && (
                <option value="" disabled={!value}>
                    {placeholder}
                </option>
            )}
            
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
};

export default Select; 