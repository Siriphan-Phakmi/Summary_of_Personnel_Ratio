'use client';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase'; // Assuming this path is correct

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum LogType {
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  PAGE_ACCESS = 'page.access',
  SYSTEM_ERROR = 'system.error',
  USER_ACTION_CREATE = 'user.action.create',
  USER_ACTION_UPDATE = 'user.action.update',
  USER_ACTION_DELETE = 'user.action.delete',
}

export const SYSTEM_LOGS_COLLECTION = 'systemLogs';
export const USER_ACTIVITY_LOGS_COLLECTION = 'userActivityLogs';

export interface LogEntryPayload {
  type: LogType | string; 
  userId?: string;
  username?: string;
  details?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  logLevel?: LogLevel;
  createdAt?: Timestamp;
}

/**
 * Adds a log entry to a specified Firestore collection.
 * @param payload The log entry data.
 * @param collectionName The name of the Firestore collection (e.g., 'systemLogs', 'userActivityLogs').
 */
export const addLogEntry = async (
  payload: LogEntryPayload,
  collectionName: string
): Promise<void> => {
  try {
    await addDoc(collection(db, collectionName), {
      ...payload,
      createdAt: payload.createdAt || Timestamp.now(),
    });
  } catch (error) {
    console.error(`Failed to add log entry to ${collectionName}:`, error);
  }
};

/**
 * บันทึกการกระทำของผู้ใช้งาน
 * @param userId รหัสผู้ใช้
 * @param username ชื่อผู้ใช้
 * @param action ประเภทการกระทำ (เช่น 'create', 'update', 'delete')
 * @param details รายละเอียดเพิ่มเติม
 */
export const logUserActivity = async (
  userId: string,
  username: string,
  action: LogType | string,
  details?: Record<string, any>
): Promise<void> => {
  try {
    const userAgent = getSafeUserAgent();
    await addLogEntry({
      type: action,
      userId,
      username,
      details,
      userAgent,
      logLevel: LogLevel.INFO,
    }, USER_ACTIVITY_LOGS_COLLECTION);
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
};

/**
 * บันทึกข้อผิดพลาดของระบบ
 * @param error ข้อผิดพลาดที่เกิดขึ้น
 * @param component ชื่อ component ที่เกิดข้อผิดพลาด
 * @param context ข้อมูลเพิ่มเติมเกี่ยวกับบริบทที่เกิดข้อผิดพลาด
 */
export const logSystemError = async (
  error: Error,
  component: string,
  context?: Record<string, any>
): Promise<void> => {
  try {
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || '';
    
    await addLogEntry({
      type: LogType.SYSTEM_ERROR,
      details: {
        message: errorMessage,
        stack: errorStack,
        component,
        ...context
      },
      userAgent: getSafeUserAgent(),
      logLevel: LogLevel.ERROR,
    }, SYSTEM_LOGS_COLLECTION);
    
    console.error(`[${component}] System Error:`, errorMessage, context);
  } catch (logError) {
    console.error('Failed to log system error:', logError);
  }
};

// Basic implementations for browser-specific utility functions
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') return { deviceType: 'Server', browserName: 'N/A' };
  const userAgent = navigator.userAgent;
  let deviceType = 'Unknown';
  let browserName = 'Unknown';

  if (/Mobi|Android/i.test(userAgent)) {
    deviceType = 'Mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    deviceType = 'Tablet';
  } else {
    deviceType = 'Desktop';
  }

  if (/(firefox|fxios)\/(\S+)/i.test(userAgent)) {
    browserName = 'Firefox';
  } else if (/(opr)\/(\S+)/i.test(userAgent) || /(opera)\/(\S*)/i.test(userAgent)) {
    browserName = 'Opera';
  } else if (/(edge)\/(\S+)/i.test(userAgent)) {
    browserName = 'Edge';
  } else if (/(chrome|crios|crmo)\/(\S+)/i.test(userAgent)) {
    browserName = 'Chrome';
  } else if (/(safari)\/(\S+)/i.test(userAgent)) {
    browserName = 'Safari';
  } else if (/(msie|trident)\/(\S+)/i.test(userAgent)) {
    browserName = 'IE';
  } else {
    browserName = 'Other';
  }
  return { deviceType, browserName };
};

export const getSafeUserAgent = () => {
  if (typeof window === 'undefined') return 'Server-side';
  return navigator.userAgent || 'Unknown User Agent';
};

export const getClientIP = () => {
  return 'N/A (Client-side)'; // This should ideally come from a server-side call
};

export const cleanupOldLogs = async (collectionName: string, days: number): Promise<number> => {
  console.warn(`[logUtils] Cleanup of old logs requested for ${collectionName} older than ${days} days.`);
  console.warn('This function needs proper implementation to interact with Firestore and delete documents.');
  return 0; 
}; 