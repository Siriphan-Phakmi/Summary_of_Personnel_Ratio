import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Thai localization constants
const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Formats a Date object or a date string into 'yyyy-MM-dd' format.
 * @param date The date to format.
 * @returns The formatted date string.
 */
export const formatDateYMD = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    // Handle invalid date gracefully
    return '';
  }
  return format(dateObj, 'yyyy-MM-dd');
};

export function formatDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

// === Thai Date Utilities ===

/**
 * แปลงวันที่เป็นชื่อวันภาษาไทย
 * @param dateString วันที่ในรูปแบบ string
 * @returns ชื่อวันภาษาไทย
 */
export const getThaiDayName = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDay();
    return THAI_DAYS[day];
  } catch (error) {
    console.error('[getThaiDayName] Error parsing date:', error);
    return '';
  }
};

/**
 * คืนค่าชื่อเดือนภาษาไทย
 * @param month เลขเดือน (0-11)
 * @returns ชื่อเดือนภาษาไทย
 */
export const getThaiMonthName = (month: number): string => {
  if (month < 0 || month > 11) {
    console.error('[getThaiMonthName] Invalid month number:', month);
    return '';
  }
  return THAI_MONTHS[month];
};

/**
 * แปลงวันที่เป็นรูปแบบไทย (วัน/เดือน/ปี พ.ศ.)
 * @param date วันที่
 * @returns วันที่ในรูปแบบไทย
 */
export const formatThaiDate = (date: Date): string => {
  try {
    const day = date.getDate();
    const month = getThaiMonthName(date.getMonth());
    const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('[formatThaiDate] Error formatting date:', error);
    return '';
  }
};

/**
 * แปลงวันที่ในรูปแบบ "YYYY-MM-DD" เป็น "DD/MM"
 * @param dateString วันที่ในรูปแบบ "YYYY-MM-DD"
 * @returns วันที่ในรูปแบบ "DD/MM"
 */
export const formatShortDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  } catch (error) {
    console.error('[formatShortDate] Error formatting date:', error);
    return '';
  }
};

/**
 * ตรวจสอบว่าวันที่อยู่ในช่วงเวลาที่กำหนดหรือไม่
 * @param date วันที่ที่ต้องการตรวจสอบ
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @returns true ถ้าวันที่อยู่ในช่วงเวลาที่กำหนด, false ถ้าไม่อยู่ในช่วง
 */
export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  try {
    const timestamp = date.getTime();
    return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
  } catch (error) {
    console.error('[isDateInRange] Error checking date range:', error);
    return false;
  }
}; 