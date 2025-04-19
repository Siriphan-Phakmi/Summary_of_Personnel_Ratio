import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { TimestampField } from '../types/user';

/**
 * แปลงวันที่เป็นรูปแบบ YYYY-MM-DD
 */
export const formatDateYMD = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * แปลงวันที่เป็นรูปแบบที่อ่านง่าย เช่น 1 มกราคม 2566
 */
export const formatDate = (date: Date | string | number, withTime: boolean = false): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const pattern = withTime ? 'd MMMM yyyy HH:mm' : 'd MMMM yyyy';
  return format(dateObj, pattern, { locale: th });
};

/**
 * แปลงวันที่เป็นรูปแบบที่อ่านง่ายในภาษาอังกฤษ เช่น January 1, 2023
 */
export const formatDateEN = (date: Date | string | number, withTime: boolean = false): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const pattern = withTime ? 'MMMM d, yyyy HH:mm' : 'MMMM d, yyyy';
  return format(dateObj, pattern);
};

/**
 * แปลงวันที่เป็นรูปแบบสำหรับแสดงในแบบฟอร์ม เช่น 01/01/2566
 */
export const formatDateForForm = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(dateObj, 'dd/MM/yyyy');
};

/**
 * แปลงวันที่จาก Firebase Timestamp
 */
export const formatTimestamp = (
  timestamp: TimestampField | null | undefined,
  pattern: string = 'd MMMM yyyy'
): string => {
  if (!timestamp) return '';
  
  let date: Date;
  
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp && 'seconds' in timestamp) {
    date = new Date((timestamp.seconds as number) * 1000);
  } else {
    return '';
  }
  
  return format(date, pattern, { locale: th });
};

/**
 * สร้าง server timestamp
 */
export const createServerTimestamp = (): TimestampField => {
  return Timestamp.now() as unknown as TimestampField;
};

/**
 * รับวันแรกของเดือน
 */
export const getFirstDayOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * รับวันสุดท้ายของเดือน
 */
export const getLastDayOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * คำนวณความแตกต่างของวันที่ในหน่วยวัน
 */
export const dayDifference = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}; 