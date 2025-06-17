import { User } from '../types/user';
import { LogLevel, LogType, LogEntry, SYSTEM_LOGS_COLLECTION, LogDetails } from '../types/log';
// import {
//     addLogEntry,
//     SYSTEM_LOGS_COLLECTION,
//     LogType,
//     getDeviceInfo,
//     LogLevel,
//     getSafeUserAgent,
//     getClientIP
// } from '@/app/core/utils/logUtils';

// สร้างค่าคงที่และฟังก์ชันที่จำเป็นภายในไฟล์เอง

// ฟังก์ชันจำลองการเพิ่ม log entry ลงในฐานข้อมูล
const addLogEntry = async (entry: Partial<LogEntry>, collection: string): Promise<void> => {
  // ในสภาพแวดล้อมจริงจะบันทึกลงฐานข้อมูล เช่น Firestore
  // แต่ในที่นี้เราจะ log ไปที่ console เท่านั้น
  console.log(`[${collection}] New log entry:`, entry);
};

// ฟังก์ชันสำหรับดึงข้อมูลอุปกรณ์
const getDeviceInfo = (): { deviceType: string; browserName: string } => {
  if (typeof window === 'undefined') {
    return { deviceType: 'server', browserName: 'server' };
  }
  
  const userAgent = window.navigator.userAgent;
  let deviceType = 'desktop';
  let browserName = 'unknown';
  
  // ตรวจสอบอุปกรณ์อย่างง่าย
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent.toLowerCase())) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent.toLowerCase())) {
    deviceType = 'tablet';
  }
  
  // ตรวจสอบเบราว์เซอร์อย่างง่าย
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browserName = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browserName = 'Edge';
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    browserName = 'Internet Explorer';
  }
  
  return { deviceType, browserName };
};

// ฟังก์ชันสำหรับดึง User Agent อย่างปลอดภัย
const getSafeUserAgent = (): string => {
  if (typeof window === 'undefined') {
    return 'server';
  }
  return window.navigator.userAgent || 'unknown';
};

// ฟังก์ชันสำหรับดึง IP Address ของ client
const getClientIP = (): string => {
  // ในสภาพแวดล้อมจริงจะต้องดึงจาก request header หรือ API
  // แต่ในที่นี้เราจะคืนค่าเป็น placeholder
  return '127.0.0.1';
};

import { logServerAction } from './logServerAction';
import { createSafeUserObject } from '../utils/userUtils';

/**
 * แสดง log เฉพาะในโหมด development
 * @param message ข้อความที่ต้องการแสดง
 */
function devLog(message: string): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(message);
  }
}

/**
 * บันทึกการเข้าสู่ระบบ
 * @param user ข้อมูลผู้ใช้
 * @param userAgent ข้อมูลเบราว์เซอร์ของผู้ใช้
 */
export const logLogin = async (
  user: User, 
  userAgent?: string
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('Cannot log login: User data is incomplete');
    return;
  }

  try {
    // ดึงข้อมูลอุปกรณ์
    const deviceInfo = getDeviceInfo();
    const userAgentStr = userAgent || getSafeUserAgent();
    const ipAddress = getClientIP();
    
    // สร้าง log details
    const details = {
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      role: user.role,
      ipAddress: ipAddress,
      success: true
    };

    // ลดความซ้ำซ้อน: ใช้เพียง logServerAction และบันทึกลงฐานข้อมูล
    // ไม่ใช้ devLog เพื่อลดความซ้ำซ้อน

    // สร้าง safe user object สำหรับ server action
    const safeUser = createSafeUserObject(user);
    
    // บันทึก log ในฝั่ง server (สำหรับ development)
    await logServerAction('login', safeUser, {
      ...details,
      userAgent: userAgentStr
    });
    
    // บันทึก log ในฐานข้อมูล
    await addLogEntry({
      type: LogType.AUTH_LOGIN,
      userId: user.uid,
      username: user.username,
      details,
      userAgent: userAgentStr,
      ipAddress,
      logLevel: LogLevel.INFO
    }, SYSTEM_LOGS_COLLECTION);
  } catch (error) {
    console.error('Failed to log login:', error);
  }
};

/**
 * บันทึกการออกจากระบบ
 * @param user ข้อมูลผู้ใช้
 * @param userAgent ข้อมูลเบราว์เซอร์ของผู้ใช้
 */
export const logLogout = async (
  user: User, 
  userAgent?: string
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('Cannot log logout: User data is incomplete');
    return;
  }

  try {
    // ดึงข้อมูลอุปกรณ์
    const deviceInfo = getDeviceInfo();
    const userAgentStr = userAgent || getSafeUserAgent();
    const ipAddress = getClientIP();
    
    // สร้าง log details
    const details = {
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      role: user.role,
      ipAddress: ipAddress
    };

    // ลดความซ้ำซ้อน: ใช้เพียง logServerAction และบันทึกลงฐานข้อมูล
    // ไม่ใช้ devLog เพื่อลดความซ้ำซ้อน

    // สร้าง safe user object สำหรับ server action
    const safeUser = createSafeUserObject(user);
    
    // บันทึก log ในฝั่ง server (สำหรับ development)
    await logServerAction('logout', safeUser, {
      ...details,
      userAgent: userAgentStr
    });
    
    // บันทึก log ในฐานข้อมูล
    await addLogEntry({
      type: LogType.AUTH_LOGOUT,
      userId: user.uid,
      username: user.username,
      details,
      userAgent: userAgentStr,
      ipAddress,
      logLevel: LogLevel.INFO
    }, SYSTEM_LOGS_COLLECTION);
  } catch (error) {
    console.error('Failed to log logout:', error);
  }
};

/**
 * บันทึกการเข้าถึงหน้าที่ต้องตรวจสอบสิทธิ์
 * @param user ข้อมูลผู้ใช้
 * @param page ชื่อหน้าที่เข้าถึง
 * @param userAgent ข้อมูลเบราว์เซอร์ของผู้ใช้
 */
export const logPageAccess = async (
  user: User,
  page: string,
  userAgent?: string
): Promise<void> => {
  // ตรวจสอบข้อมูล user อย่างละเอียด
  if (!user) {
    console.error('Cannot log page access: User is null');
    return;
  }
  
  if (!user?.uid || !user?.username) {
    console.error('Cannot log page access: User data is incomplete');
    return;
  }

  try {
    // ดึงข้อมูลอุปกรณ์
    const deviceInfo = getDeviceInfo();
    const userAgentStr = userAgent || getSafeUserAgent();
    const ipAddress = getClientIP();
    
    // สร้าง log details
    const details = {
      page,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      role: user.role,
      ipAddress: ipAddress
    };

    // ลดความซ้ำซ้อน: ใช้เพียง logServerAction และบันทึกลงฐานข้อมูล
    // ไม่ใช้ devLog เพื่อลดความซ้ำซ้อน

    // สร้าง safe user object สำหรับ server action
    const safeUser = createSafeUserObject(user);
    
    // บันทึก log ในฝั่ง server (สำหรับ development)
    await logServerAction('page_access', safeUser, {
      ...details,
      userAgent: userAgentStr
    });
    
    // บันทึก log ในฐานข้อมูล
    await addLogEntry({
      type: LogType.PAGE_ACCESS,
      userId: user.uid,
      username: user.username,
      details,
      userAgent: userAgentStr,
      ipAddress,
      logLevel: LogLevel.INFO
    }, SYSTEM_LOGS_COLLECTION);
  } catch (error) {
    console.error('Failed to log page access:', error);
  }
};

/**
 * บันทึกข้อผิดพลาดของระบบ
 * @param error อ็อบเจกต์ข้อผิดพลาด
 * @param context ข้อมูลเพิ่มเติมเกี่ยวกับที่มาของข้อผิดพลาด
 * @param user ข้อมูลผู้ใช้ (ถ้ามี)
 */
export const logSystemError = async (
  error: any,
  context: string,
  user?: User | null
): Promise<void> => {
  try {
    const deviceInfo = getDeviceInfo();
    const userAgentStr = getSafeUserAgent();
    const ipAddress = getClientIP();

    const details = {
      context: context,
      errorMessage: error.message,
      stackTrace: error.stack,
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      ipAddress: ipAddress
    };
    
    // บันทึก log ในฐานข้อมูล
    await addLogEntry({
      type: LogType.SYSTEM_ERROR,
      userId: user?.uid,
      username: user?.username || 'system',
      details,
      userAgent: userAgentStr,
      ipAddress,
      logLevel: LogLevel.ERROR
    }, SYSTEM_LOGS_COLLECTION);
  } catch (logError) {
    console.error('Failed to log system error:', logError);
    // Fallback logging
    console.error('Original error:', {
      context,
      errorMessage: error.message,
    });
  }
};

/**
 * บันทึกการกระทำของผู้ใช้ (User Action)
 * @param user ข้อมูลผู้ใช้
 * @param action ชื่อการกระทำ เช่น 'SAVE_DRAFT', 'FINALIZE_FORM'
 * @param details ข้อมูลเพิ่มเติมเกี่ยวกับการกระทำ
 */
export const logUserAction = async (
  user: User,
  action: string,
  details: Record<string, any> = {}
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('Cannot log user action: User data is incomplete');
    return;
  }

  try {
    const deviceInfo = getDeviceInfo();
    const userAgentStr = getSafeUserAgent();
    const ipAddress = getClientIP();

    const logDetails: LogDetails = {
      ...details,
      action, // Add action to the details object
      timestamp: new Date().toISOString(),
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      role: user.role,
      ipAddress: ipAddress,
    };
    
    // The call to logServerAction has been removed to avoid type conflicts with generic actions.
    // The primary log is the one sent to the database via addLogEntry.

    await addLogEntry({
      type: LogType.USER_ACTION,
      userId: user.uid,
      username: user.username,
      details: logDetails, // Pass the enriched details object
      userAgent: userAgentStr,
      ipAddress,
      logLevel: LogLevel.INFO,
    }, SYSTEM_LOGS_COLLECTION);
  } catch (error) {
    console.error(`Failed to log action [${action}]:`, error);
  }
}; 