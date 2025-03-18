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
export const formatThaiDate = (date, formatStr = 'd MMMM yyyy') => {
  if (!date) return '';
  
  try {
    const thaiYear = addYears(new Date(date), BE_OFFSET);
    return format(thaiYear, formatStr, { locale: th });
  } catch (error) {
    console.error('Error formatting Thai date:', error);
    return '';
  }
};

/**
 * แปลงวันที่ให้เป็นรูปแบบ UTC (yyyy-MM-dd)
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่ในรูปแบบ UTC
 */
export const getUTCDateString = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error getting UTC date string:', error);
    return '';
  }
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
    if (!date) return '';
    
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error in formatDateString:', error);
        return '';
    }
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