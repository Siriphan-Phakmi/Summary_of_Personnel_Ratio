'use client';

import { format } from 'date-fns';
import { Ward } from '@/app/features/ward-form/types/ward';

/**
 * สำหรับ development mode เท่านั้น - ใช้สำหรับการ log ข้อมูล
 * @param message ข้อความที่ต้องการบันทึก
 * @param data ข้อมูลเพิ่มเติม
 */
export const logInfo = (message: string, ...data: any[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    const currentTimestamp = new Date();
    console.info(`${format(currentTimestamp, 'HH:mm:ss')} [Dashboard] ${message}`, ...data);
  }
};

/**
 * สำหรับ development mode เท่านั้น - ใช้สำหรับการ log ข้อผิดพลาด
 * @param message ข้อความที่ต้องการบันทึก
 * @param error ข้อผิดพลาดที่เกิดขึ้น
 * @param context บริบทที่เกิดข้อผิดพลาด
 * @param timestamp เวลาที่เกิดข้อผิดพลาด
 */
export const logError = (message: string, ...data: any[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    const currentTimestamp = new Date();
    console.error(`${format(currentTimestamp, 'HH:mm:ss')} [Dashboard] ${message}`, ...data);
  } else {
    // ในโหมด production อาจส่งข้อมูลไปยังระบบ error tracking เช่น Sentry
    // หรือเก็บใน analytics โดยไม่มีข้อมูลส่วนบุคคล
  }
};

/**
 * ดึงชื่อวันในภาษาไทยจากวันที่
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @returns ชื่อวันในภาษาไทย
 */
export const getThaiDayName = (dateString: string): string => {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  try {
    const date = new Date(dateString);
    const dayIndex = date.getDay();
    return `วัน${days[dayIndex]}`;
  } catch (err) {
    logError('Error parsing date', err);
    return '';
  }
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึง ward ที่ระบุหรือไม่
 * @param wardId รหัส ward ที่ต้องการตรวจสอบ
 * @param wards รายการ ward ทั้งหมดที่ผู้ใช้มีสิทธิ์เข้าถึง
 * @returns true ถ้าผู้ใช้มีสิทธิ์เข้าถึง ward ที่ระบุ, false ถ้าไม่มีสิทธิ์
 */
export const hasAccessToWard = (wardId: string, wards: Ward[]): boolean => {
  if (!wardId) return false;
  
  return wards.some(ward => 
    ward.id?.toUpperCase() === wardId.toUpperCase()
  );
};

export default {
  logInfo,
  logError,
  hasAccessToWard
}; 