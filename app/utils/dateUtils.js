'use client';

import { format } from 'date-fns-tz';
import { addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import { BE_OFFSET } from './constants';

/**
 * แปลงวันที่ให้เป็นรูปแบบไทย (พ.ศ.)
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @param {string} formatStr - รูปแบบการแสดงผล (default: 'd MMMM yyyy')
 * @returns {string} วันที่ในรูปแบบไทย
 */
export const formatThaiDate = (date) => {
    if (!date) return 'คุณยังไม่ได้เลือกวันที่';

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = thaiMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543;

    return `${day} ${month} ${year}`;
};

/**
 * แปลงวันที่ให้เป็นรูปแบบ UTC (yyyy-MM-dd)
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่ในรูปแบบ UTC
 */
export const getUTCDateString = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// เพิ่มฟังก์ชันสำหรับตรวจสอบความถูกต้องของวันที่
export const isValidDate = (date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
};

// เพิ่มฟังก์ชันสำหรับฟอร์แมตวันที่ให้อยู่ในรูปแบบ YYYY-MM-DD
export const formatDateToISO = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (!isValidDate(d)) return '';
    return d.toISOString().split('T')[0];
};

// เพิ่มฟังก์ชันจาก Calendar.js
export const formatDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * รับวันที่ปัจจุบันในรูปแบบไทย
 * @returns {string} วันที่ปัจจุบันในรูปแบบไทย
 */
export const getThaiDateNow = () => {
    return formatThaiDate(new Date());
};

/**
 * แปลงวันที่เป็นรูปแบบ yyyy-MM-dd
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่ในรูปแบบ yyyy-MM-dd
 */
export const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    
    try {
        return format(new Date(date), 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date to YYYY-MM-DD:', error);
        return '';
    }
};

/**
 * รับรายชื่อเดือนทั้งหมด
 * @returns {Array} รายชื่อเดือน 0-11
 */
export const getMonths = () => {
    return ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
};

/**
 * รับช่วงปีสำหรับ dropdown
 * @param {number} currentYear - ปีปัจจุบัน
 * @param {number} range - จำนวนปีย้อนหลังและล่วงหน้า (default: 5)
 * @returns {Array} ช่วงปีตั้งแต่ currentYear-range ถึง currentYear+range
 */
export const getYearRange = (currentYear) => {
    const years = [];
    for (let year = 2000; year <= 4000; year++) {
        years.push(year);
    }
    return years;
};