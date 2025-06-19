import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { Logger } from '@/app/lib/utils/logger';

/**
 * แปลงและจัดรูปแบบ timestamp เป็นข้อความระยะห่างจากปัจจุบัน
 */
export const formatTimestamp = (timestamp: Timestamp | null | Date | number | string): string => {
  try {
    let date: Date;
    
    if (!timestamp) {
      date = new Date();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      // Firebase Timestamp
      date = timestamp.toDate();
    } else {
      date = new Date();
      Logger.error('Invalid timestamp format', timestamp);
    }
    
    return formatDistanceToNow(date, { addSuffix: true, locale: th });
  } catch (e) {
    Logger.error("Error formatting timestamp", e);
    return 'ไม่ทราบเวลา';
  }
};

/**
 * สร้าง className สำหรับ notification item ตามสถานะ isRead
 */
export const getNotificationItemClassName = (isRead: boolean): string => {
  const baseClass = "p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";
  const unreadClass = "bg-blue-50 dark:bg-blue-900/20";
  
  return isRead ? baseClass : `${baseClass} ${unreadClass}`;
};

/**
 * สร้าง className สำหรับ notification title ตามสถานะ isRead
 */
export const getNotificationTitleClassName = (isRead: boolean): string => {
  return isRead 
    ? 'font-semibold text-gray-600 dark:text-gray-300' 
    : 'font-semibold text-gray-900 dark:text-white';
};

/**
 * สร้าง className สำหรับ notification message ตามสถานะ isRead
 */
export const getNotificationMessageClassName = (isRead: boolean): string => {
  const baseClass = "text-gray-600 dark:text-gray-400 mb-1";
  return isRead ? `${baseClass} font-light` : `${baseClass} font-normal`;
};

/**
 * กำหนดการ navigation ของ notification link
 */
export const getNotificationLinkProps = (actionUrl?: string) => {
  if (!actionUrl) {
    return { href: '#' };
  }
  
  const isExternal = actionUrl.startsWith('http');
  return {
    href: actionUrl,
    target: isExternal ? '_blank' : '_self',
    rel: isExternal ? 'noopener noreferrer' : undefined
  };
}; 