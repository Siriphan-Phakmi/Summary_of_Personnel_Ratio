import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';

// Collection for system logs
export const SYSTEM_LOGS_COLLECTION = 'systemLogs';

// Simplified Log types for current needs
export enum LogType {
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_LOGOUT = 'auth.logout',
  SYSTEM_ERROR = 'system.error', // Keep system error logging
}

// Log entry interface (kept generic)
export interface LogEntry {
  type: string;
  userId: string;
  username: string;
  details?: any;
  createdAt?: any;
  userAgent?: string;
  ipAddress?: string; // Optional, if you plan to capture IP later
  environment?: string;
}

/**
 * Add a log entry to the database
 * Base function for logging
 */
export const addLogEntry = async (logEntry: LogEntry): Promise<string | null> => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    
    const sanitizedEntry: Record<string, any> = {};
    Object.entries(logEntry).forEach(([key, value]) => {
      if (value !== undefined) {
        sanitizedEntry[key] = value;
      }
    });
    
    const entry = {
      ...sanitizedEntry,
      createdAt: serverTimestamp(),
      environment
    };
    
    const docRef = await addDoc(collection(db, SYSTEM_LOGS_COLLECTION), entry);
    return docRef.id;
  } catch (error) {
    console.error('Error adding log entry:', error);
    return null;
  }
};

/**
 * Get browser user agent safely
 */
export const getSafeUserAgent = (): string => {
  if (typeof window === 'undefined') {
    return 'Server Side Rendering';
  }
  try {
    return window?.navigator?.userAgent || 'Browser (Unknown UA)';
  } catch (error) {
    console.error('Error getting user agent:', error);
    return 'Error Getting User Agent';
  }
};

/**
 * Detect basic device info (can be simplified if full detail isn't needed now)
 */
export const getDeviceInfo = (): { deviceType: string; browserName: string } => {
  try {
    if (typeof window === 'undefined') {
      return { deviceType: 'Server', browserName: 'None' };
    }

    const ua = window.navigator.userAgent.toLowerCase();
    
    let browserName = 'Unknown';
    if (ua.includes('edge') || ua.includes('edg')) browserName = 'Edge';
    else if (ua.includes('chrome') && !ua.includes('chromium')) browserName = 'Chrome';
    else if (ua.includes('firefox')) browserName = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browserName = 'Safari';
    else if (ua.includes('msie') || ua.includes('trident')) browserName = 'Internet Explorer';
    else if (ua.includes('opera') || ua.includes('opr')) browserName = 'Opera';

    let deviceType = 'Desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) deviceType = 'Tablet';
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) deviceType = 'Mobile';

    return { deviceType, browserName };
  } catch (error) {
    console.error('Error detecting device:', error);
    return { deviceType: 'Unknown', browserName: 'Unknown' };
  }
};

/**
 * Log successful login
 */
export const logLogin = async (
  userId: string,
  username: string,
  userAgent?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  return addLogEntry({
    type: LogType.AUTH_LOGIN,
    userId,
    username,
    details: {
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: userAgent || getSafeUserAgent()
  });
};

/**
 * Log failed login attempt
 */
export const logLoginFailed = async (
  username: string,
  reason: string,
  userAgent?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  return addLogEntry({
    type: LogType.AUTH_LOGIN_FAILED,
    userId: 'unknown', // Or capture attempted user ID if possible
    username,
    details: {
      reason,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: userAgent || getSafeUserAgent()
  });
};

/**
 * Log logout
 */
export const logLogout = async (
  userId: string,
  username: string,
  userAgent?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  return addLogEntry({
    type: LogType.AUTH_LOGOUT,
    userId,
    username,
    details: {
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: userAgent || getSafeUserAgent()
  });
};

/**
 * Log system error (kept as it's generally useful)
 */
export const logSystemError = async (
  error: Error,
  componentName: string,
  userId?: string
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  return addLogEntry({
    type: LogType.SYSTEM_ERROR,
    userId: userId || 'system',
    username: 'system',
    details: {
      errorMessage: error.message,
      stack: error.stack,
      componentName,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: getSafeUserAgent()
  });
}; 