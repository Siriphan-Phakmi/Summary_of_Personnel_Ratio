import { collection, addDoc, serverTimestamp, setDoc, doc, query, where, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { format } from 'date-fns'; // Assuming date-fns is available

// Collection for system logs
export const SYSTEM_LOGS_COLLECTION = 'systemLogs';
// Collection for user activity logs (as requested by user)
export const USER_ACTIVITY_LOGS_COLLECTION = 'userActivityLogs';

// Simplified Log types for current needs
export enum LogType {
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_LOGOUT = 'auth.logout',
  SYSTEM_ERROR = 'system.error', // Keep system error logging
}

// Add new log level enum
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry interface (kept generic, ensure needed fields for ID are present)
export interface LogEntry {
  type: string; // e.g., 'auth.login', 'page.access', 'delete', 'update'
  userId: string;
  username: string;
  logLevel?: LogLevel; // Add log level
  action?: string; // Specifically for userActivityLogs ID format
  details?: any;
  createdAt?: any; // Will be replaced by serverTimestamp in the entry data
  userAgent?: string;
  ipAddress?: string; // Optional, if you plan to capture IP later
  environment?: string;
  os?: string;
  startTime?: string;
  lastActive?: string;
  isActive?: boolean;
  deviceInfo?: string;
  browser?: string; // Used in systemLogs ID format in user example, ensure it's available
}

// Helper function to format date and time for ID
const formatDateTimeForId = (date: Date): { dateStr: string, timeStr: string } => {
  const dateStr = format(date, 'yyyyMMdd');
  const timeStr = format(date, 'HHmmssSSS'); // Added milliseconds (SSS)
  return { dateStr, timeStr };
};

// Helper function to generate custom ID
const generateCustomLogId = (
    collectionName: string,
    logEntry: LogEntry
): string => {
    const now = new Date();
    const { dateStr, timeStr } = formatDateTimeForId(now);
    const username = logEntry.username?.replace(/[^a-zA-Z0-9_]/g, '') || 'unknown_user'; // Sanitize username

    if (collectionName === USER_ACTIVITY_LOGS_COLLECTION) {
        const action = logEntry.action?.replace(/[^a-zA-Z0-9_]/g, '') || 'unknown_action';
        return `${username}_${action}_D${dateStr}_T${timeStr}`;
    } else { // Default to systemLogs format
        const type = logEntry.type?.replace(/[^a-zA-Z0-9._-]/g, '') || 'unknown_type'; // Allow dots/hyphens in type
        // Using type instead of browserName for more general applicability based on user example context
        return `${username}_${type}_D${dateStr}_T${timeStr}`;
    }
};

/**
 * ลบ logs เก่าที่เกิน daysToKeep วัน
 * @param collectionName ชื่อ collection ที่ต้องการลบ logs ('systemLogs' หรือ 'userActivityLogs')
 * @param daysToKeep จำนวนวันที่ต้องการเก็บ logs (ค่าเริ่มต้น: 90 วัน)
 * @returns จำนวน logs ที่ถูกลบ
 */
export const cleanupOldLogs = async (collectionName: string, daysToKeep: number = 90): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const logsRef = collection(db, collectionName);
    const q = query(logsRef, where('createdAt', '<', Timestamp.fromDate(cutoffDate)));
    const snapshot = await getDocs(q);
    
    // รองรับการลบมากกว่า 500 รายการ (Firestore batch limit)
    let count = 0;
    const batchSize = 450; // ใช้ 450 เพื่อให้มี margin
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    snapshot.forEach(doc => {
      currentBatch.delete(doc.ref);
      operationCount++;
      count++;
      
      // แบ่ง batch เมื่อใกล้ถึงขีดจำกัด
      if (operationCount >= batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // commit batch สุดท้าย ถ้ามีรายการเหลืออยู่
    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }
    
    // รอทุก batches เสร็จสิ้น
    if (batches.length > 0) {
      await Promise.all(batches);
      console.log(`Deleted ${count} old logs from ${collectionName} using ${batches.length} batches`);
    } else if (count > 0) {
      await currentBatch.commit();
      console.log(`Deleted ${count} old logs from ${collectionName}`);
    }
    
    return count;
  } catch (error) {
    console.error(`Error cleaning up old logs from ${collectionName}:`, error);
    return 0;
    }
};

/**
 * Add a log entry to the specified collection with a custom ID
 * @param logEntry The log data
 * @param collectionName The target collection ('systemLogs' or 'userActivityLogs')
 */
export const addLogEntry = async (logEntry: LogEntry, collectionName: string): Promise<string | null> => {
  try {
    const environment = process.env.NODE_ENV || 'development';

    // Default to INFO level if not specified
    if (!logEntry.logLevel) {
      logEntry.logLevel = LogLevel.INFO;
    }

    const sanitizedEntry: Record<string, any> = {};
    Object.entries(logEntry).forEach(([key, value]) => {
      // Keep action field if it exists, even if undefined, as it might be needed for the ID
      if (value !== undefined || key === 'action') {
          sanitizedEntry[key] = value;
      }
    });

    // Generate custom ID
    const customId = generateCustomLogId(collectionName, logEntry);

    const entry = {
      ...sanitizedEntry,
      createdAt: serverTimestamp(), // Use server timestamp for the data field
      environment
    };

    // Use setDoc with the custom ID
    const docRef = doc(db, collectionName, customId);
    await setDoc(docRef, entry);

    // In development mode, also log to console for visibility
    if (process.env.NODE_ENV === 'development') {
      // Only log to console in dev mode to reduce console noise in production
      const level = logEntry.logLevel || LogLevel.INFO;
      if (level === LogLevel.ERROR) {
        console.error(`[${level.toUpperCase()}][${logEntry.type}] ${JSON.stringify(logEntry.details)}`);
      } else if (level === LogLevel.WARN) {
        console.warn(`[${level.toUpperCase()}][${logEntry.type}] ${JSON.stringify(logEntry.details)}`);
      } else {
        console.log(`[${level.toUpperCase()}][${logEntry.type}] ${JSON.stringify(logEntry.details)}`);
      }
    }

    return customId; // Return the generated ID
  } catch (error) {
    console.error(`Error adding log entry to ${collectionName}:`, error);
    // Avoid showing toast errors for logging failures usually, just log to console
    return null;
  }
};

/**
 * ปรับปรุงฟังก์ชันที่ใช้ navigator object
 * Get browser user agent safely
 */
export const getSafeUserAgent = (): string => {
  if (typeof window === 'undefined') {
    return 'Server Side Rendering';
  }
  try {
    return typeof navigator !== 'undefined' && navigator?.userAgent 
      ? navigator.userAgent 
      : 'Browser (Unknown UA)';
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

    // ตรวจสอบการมีอยู่ของ navigator และ userAgent 
    if (typeof navigator === 'undefined' || !navigator.userAgent) {
      return { deviceType: 'Unknown', browserName: 'Unknown' };
    }

    const ua = navigator.userAgent;
    const uaLower = ua.toLowerCase(); // Use lowercase for consistent checks

    let browserName = 'Unknown';

    // Check for Edge (Chromium-based) first - Look for "Edg/"
    if (ua.includes('Edg/')) {
        browserName = 'Edge';
    }
    // Check for Opera
    else if (ua.includes('OPR/') || ua.includes('Opera')) {
        browserName = 'Opera';
    }
    // Check for Chrome (ensure it's not Edge)
    else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
        browserName = 'Chrome';
    }
    // Check for Safari (ensure it's not Chrome or Edge)
    else if (ua.includes('Safari/') && !ua.includes('Chrome/') && !ua.includes('Edg/')) {
        browserName = 'Safari';
    }
    // Check for Firefox
    else if (ua.includes('Firefox/')) {
        browserName = 'Firefox';
    }
    // Check for IE (less common now)
    else if (uaLower.includes('msie') || ua.includes('Trident/')) { // Trident is for IE11
        browserName = 'Internet Explorer';
    }

    let deviceType = 'Desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(uaLower)) deviceType = 'Tablet';
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(uaLower)) deviceType = 'Mobile';

    return { deviceType, browserName };
  } catch (error) {
    console.error('Error detecting device:', error);
    return { deviceType: 'Unknown', browserName: 'Unknown' };
  }
};

/**
 * Get client IP address if possible (note: may only work in server components/API routes)
 * 
 * Note: This function can only reliably get IP in server-side contexts.
 * Client-side will always return 'Client IP Unavailable'.
 * 
 * For accurate IP logging, use a server endpoint that has access to request headers.
 */
export const getClientIP = (): string => {
  if (typeof window === 'undefined') {
    // Server-side context - ในสภาพแวดล้อมจริงควรดึง IP จาก request headers
    // เช่น x-forwarded-for, x-real-ip ใน Next.js API routes หรือ middleware
    return 'Server Side - IP Should Be Obtained From Request';
  }
  
  // Client-side cannot reliably get IP address without a service
  return 'Client IP Unavailable';
};

/**
 * บันทึกการเข้าสู่ระบบของผู้ใช้
 * @param userId ID ของผู้ใช้
 * @param username ชื่อผู้ใช้
 * @param role บทบาทของผู้ใช้
 * @param userAgent ข้อมูลเบราว์เซอร์ของผู้ใช้ (ถ้ามี)
 * @param parsedBrowserName ชื่อ Browser ที่ parse จาก User Agent ในฝั่ง Server (ถ้ามี)
 * @param parsedDeviceType ประเภท Device ที่ parse จาก User Agent ในฝั่ง Server (ถ้ามี)
 * @returns void
 */
export const logLogin = async (
  userId: string,
  username: string,
  role: string = 'user',
  userAgent?: string,
  parsedBrowserName?: string,
  parsedDeviceType?: string
): Promise<void> => {
  try {
    const finalBrowserName = parsedBrowserName || 'Unknown';
    const finalDeviceType = parsedDeviceType || 'Unknown';

    await addLogEntry({
      type: LogType.AUTH_LOGIN,
      userId,
      username,
      details: {
        timestamp: new Date().toISOString(),
        deviceType: finalDeviceType,
        browserName: finalBrowserName,
        role: role,
        success: true
      },
      userAgent: userAgent || getSafeUserAgent(),
    }, SYSTEM_LOGS_COLLECTION);
  } catch (error) {
    console.error('Error logging login:', error);
  }
};

/**
 * Log failed login attempt
 */
export const logLoginFailed = async (
  username: string,
  reason: string,
  userAgent?: string,
  parsedBrowserName?: string,
  parsedDeviceType?: string
): Promise<string | null> => {
  const finalBrowserName = parsedBrowserName || 'Unknown';
  const finalDeviceType = parsedDeviceType || 'Unknown';

  return addLogEntry({
    type: LogType.AUTH_LOGIN_FAILED,
    userId: 'unknown',
    username,
    details: {
      reason,
      timestamp: new Date().toISOString(),
      deviceType: finalDeviceType,
      browserName: finalBrowserName
    },
    userAgent: userAgent || getSafeUserAgent(),
  }, SYSTEM_LOGS_COLLECTION);
};

/**
 * บันทึกการออกจากระบบของผู้ใช้
 * @param userId ID ของผู้ใช้
 * @param username ชื่อผู้ใช้
 * @param role บทบาทของผู้ใช้
 * @param userAgent ข้อมูลเบราว์เซอร์ของผู้ใช้ (ถ้ามี)
 * @param parsedBrowserName ชื่อ Browser ที่ parse จาก User Agent ในฝั่ง Server (ถ้ามี)
 * @param parsedDeviceType ประเภท Device ที่ parse จาก User Agent ในฝั่ง Server (ถ้ามี)
 * @returns void
 */
export const logLogout = async (
  userId: string,
  username: string,
  role: string = 'user',
  userAgent?: string,
  parsedBrowserName?: string,
  parsedDeviceType?: string
): Promise<void> => {
  try {
    const finalBrowserName = parsedBrowserName || 'Unknown';
    const finalDeviceType = parsedDeviceType || 'Unknown';

    await addLogEntry({
      type: LogType.AUTH_LOGOUT,
      userId,
      username,
      details: {
        timestamp: new Date().toISOString(),
        deviceType: finalDeviceType,
        browserName: finalBrowserName,
        role: role
      },
      userAgent: userAgent || getSafeUserAgent(),
    }, SYSTEM_LOGS_COLLECTION); // Target systemLogs
  } catch (error) {
    console.error('Error logging logout:', error);
  }
};

/**
 * Log system error (kept as it's generally useful)
 */
export const logSystemError = async (
  error: Error,
  componentName: string,
  userId?: string,
  username?: string // Add username if available
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  return addLogEntry({
    type: LogType.SYSTEM_ERROR,
    userId: userId || 'system',
    username: username || 'system', // Use provided username or default to 'system'
    details: {
      errorMessage: error.message,
      stack: error.stack,
      componentName,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: getSafeUserAgent(),
    browser: deviceInfo.browserName
  }, SYSTEM_LOGS_COLLECTION); // Target systemLogs
};

/**
 * Log a specific user action (e.g., delete, update, create)
 * @param userId User ID performing the action
 * @param username Username performing the action
 * @param action The action performed (e.g., 'delete', 'update_ward', 'create_form')
 * @param details Additional details about the action
 */
export const logUserActivity = async (
  userId: string,
  username: string,
  action: string,
  details: any
): Promise<string | null> => {
  const deviceInfo = getDeviceInfo();
  return addLogEntry({
    type: `user.action.${action}`, // Set a meaningful type
    userId,
    username,
    action: action, // Pass action for the ID generation
    details: {
      ...details, // Include specific details passed in
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName
    },
    userAgent: getSafeUserAgent(),
    browser: deviceInfo.browserName
  }, USER_ACTIVITY_LOGS_COLLECTION); // Target userActivityLogs
};

// Example of logging page access (modify if needed)
export const logPageAccess = async (user: any, pagePath: string): Promise<void> => {
    try {
        const deviceInfo = getDeviceInfo();
        await addLogEntry({
            type: 'page.access', // Specific type for page access
            userId: user.uid,
            username: user.username || 'unknown',
            details: {
                page: pagePath,
                role: user.role,
                timestamp: new Date().toISOString(),
                deviceType: deviceInfo.deviceType,
                browserName: deviceInfo.browserName,
            },
            userAgent: getSafeUserAgent(),
            browser: deviceInfo.browserName,
        }, SYSTEM_LOGS_COLLECTION); // Typically page access goes to system logs
    } catch (error) {
        console.error('Error logging page access:', error);
    }
}; 