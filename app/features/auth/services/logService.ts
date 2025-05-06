import { User } from '@/app/core/types/user';
import {
    logLogin as utilsLogLogin,
    logLogout as utilsLogLogout,
    addLogEntry as utilsAddLogEntry,
    SYSTEM_LOGS_COLLECTION,
    LogType,
    getDeviceInfo,
    LogLevel,
    getSafeUserAgent,
    getClientIP
} from '@/app/core/utils/logUtils';
import { logServerAction } from './logServerAction';

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
 * สร้าง user object ที่ปลอดภัยสำหรับ server action (ไม่มี complex objects)
 */
function createSafeUserObject(user: User): Record<string, any> {
  // สร้าง plain object ใหม่ที่มีเฉพาะค่าพื้นฐาน
  return {
    uid: user.uid,
    username: user.username || '',
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName
  };
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
    await utilsAddLogEntry({
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
    await utilsAddLogEntry({
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
    await utilsAddLogEntry({
      type: 'page.access',
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