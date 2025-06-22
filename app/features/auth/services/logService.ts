import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { User } from '../types/user';
import { 
  StandardLog, 
  Actor, 
  Action, 
  Target, 
  ClientInfo, 
  ActionStatus, 
  SYSTEM_LOGS_COLLECTION, 
  USER_ACTIVITY_LOGS_COLLECTION 
} from '../types/log';
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

// Helper to create a standard log entry
const createLogEntry = async (
  collectionName: string,
  actor: Actor,
  action: Action,
  clientInfo?: ClientInfo,
  target?: Target,
  details?: Record<string, any>
): Promise<void> => {
  const logEntry: StandardLog = {
    timestamp: serverTimestamp(),
    actor,
    action,
    ...(target && { target }),
    ...(clientInfo && { clientInfo }),
    ...(details && { details }),
  };

  try {
    const logsRef = collection(db, collectionName);
    await addDoc(logsRef, logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${collectionName}] Log entry saved:`, { ...logEntry, timestamp: new Date() });
    }
  } catch (error) {
    console.error(`Failed to save log to ${collectionName}:`, error);
    console.log(`[${collectionName}] FALLBACK LOG:`, { ...logEntry, timestamp: new Date() });
  }
};

// Centralized helper to create a well-formed Actor object
const createActorFromUser = (user: User | null | undefined): Actor => {
  if (!user || !user.uid || !user.username) {
    return { id: 'SYSTEM', username: 'SYSTEM', role: 'SYSTEM', active: true };
  }
  
  const actor: Actor = {
    id: user.uid,
    username: user.username,
    role: user.role,
    // Always provide a boolean value for active field to prevent Firestore errors
    active: typeof user.isActive === 'boolean' ? user.isActive : true
  };
  
  // Conditionally add timestamp properties only if they are valid
  // to prevent 'undefined' values being sent to Firestore.
  if (user.createdAt) {
    actor.createdAt = user.createdAt;
  }
  if (user.updatedAt) {
    actor.updatedAt = user.updatedAt;
  }

  return actor;
};

const getClientInfo = (req?: Request): ClientInfo => {
    if (typeof window !== 'undefined') {
        const userAgent = window.navigator.userAgent || 'unknown';
        let deviceType: ClientInfo['deviceType'] = 'desktop';
        if (/mobile/i.test(userAgent)) deviceType = 'mobile';
        else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
        
        return { userAgent, deviceType, ipAddress: '127.0.0.1' }; // IP is a placeholder on client, should be resolved server-side
    }
    
    if (req) {
        const userAgent = req.headers.get('user-agent') || 'unknown-server';
        let deviceType: ClientInfo['deviceType'] = 'desktop';
        if (/mobile/i.test(userAgent)) deviceType = 'mobile';
        else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
        
        const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
        return { userAgent, deviceType, ipAddress: ip };
    }

    return { userAgent: 'server', deviceType: 'server' };
}

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
    const deviceInfo = getDeviceInfo();
    const userAgentStr = userAgent || getSafeUserAgent();
    const ipAddress = getClientIP();
    
    const details = {
      role: user.role,
      success: true
    };

    const actor = createActorFromUser(user);
    const action: Action = { type: 'AUTH.LOGIN', status: 'SUCCESS' };
    const clientInfo: ClientInfo = {
        userAgent: userAgentStr,
        ipAddress: ipAddress,
        deviceType: deviceInfo.deviceType as ClientInfo['deviceType'],
    };
    
    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
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
    const deviceInfo = getDeviceInfo();
    const userAgentStr = userAgent || getSafeUserAgent();
    const ipAddress = getClientIP();
    
    const details = {
      role: user.role,
    };

    const actor = createActorFromUser(user);
    const action: Action = { type: 'AUTH.LOGOUT', status: 'SUCCESS' };
    const clientInfo: ClientInfo = {
      userAgent: userAgentStr,
      ipAddress: ipAddress,
      deviceType: deviceInfo.deviceType as ClientInfo['deviceType'],
    };
    
    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
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
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('Cannot log page access: User data is incomplete');
    return;
  }

  const actor = createActorFromUser(user);
  const action: Action = { type: 'NAVIGATION.PAGE_VIEW', status: 'SUCCESS' };
  const clientInfo = getClientInfo(req);
  const details = { page };

  await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
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
  user?: User | null,
  req?: Request
): Promise<void> => {
  const actor = createActorFromUser(user || null);
  
  const action: Action = { type: 'SYSTEM.ERROR', status: 'FAILURE' };
  const clientInfo = getClientInfo(req);

  const details: Record<string, any> = {
    context,
    errorMessage: error.message,
    errorStack: error.stack,
  };

  await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
};

/**
 * บันทึกการกระทำของผู้ใช้ (User Action)
 * @param user ข้อมูลผู้ใช้
 * @param actionType ชื่อการกระทำ เช่น 'SAVE_DRAFT', 'FINALIZE_FORM'
 * @param status สถานะของการกระทำ
 * @param target ข้อมูลเพิ่มเติมเกี่ยวกับการกระทำ
 */
export const logUserAction = async (
  user: User,
  actionType: string,
  status: ActionStatus,
  target?: Target,
  details?: Record<string, any>,
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('Cannot log user action: User data is incomplete');
    return;
  }

  const actor = createActorFromUser(user);
  const action: Action = { type: actionType, status };
  const clientInfo = getClientInfo(req);

  await createLogEntry(USER_ACTIVITY_LOGS_COLLECTION, actor, action, clientInfo, target, details);
};

// --- Public Log Functions ---

export const logAuthEvent = async (user: User, type: 'LOGIN' | 'LOGOUT', status: ActionStatus, req?: Request): Promise<void> => {
  const actor = createActorFromUser(user);
  const action: Action = { type: `AUTH.${type}`, status };
  const clientInfo = getClientInfo(req);

  await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo);
}; 