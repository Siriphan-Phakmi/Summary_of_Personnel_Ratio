/**
 * Utility functions เกี่ยวกับวันที่สำหรับ Dashboard
 */

/**
 * แปลงวันที่เป็นชื่อวันภาษาไทย
 * 
 * @param dateString วันที่ในรูปแบบ string
 * @returns ชื่อวันภาษาไทย
 */
export const getThaiDayName = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDay();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return thaiDays[day];
  } catch (error) {
    console.error('[getThaiDayName] Error parsing date:', error);
    return '';
  }
};

/**
 * คืนค่าชื่อเดือนภาษาไทย
 * 
 * @param month เลขเดือน (0-11)
 * @returns ชื่อเดือนภาษาไทย
 */
export const getThaiMonthName = (month: number): string => {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  if (month < 0 || month > 11) {
    console.error('[getThaiMonthName] Invalid month number:', month);
    return '';
  }
  
  return thaiMonths[month];
};

/**
 * แปลงวันที่เป็นรูปแบบไทย (วัน/เดือน/ปี พ.ศ.)
 * 
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
 * 
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
 * 
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

export default {
  getThaiDayName,
  getThaiMonthName,
  formatThaiDate,
  formatShortDate,
  isDateInRange
}; 