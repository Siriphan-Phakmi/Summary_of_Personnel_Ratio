import { User } from '@/app/core/types/user';
import {
    logLogin as utilsLogLogin,
    logLogout as utilsLogLogout,
    addLogEntry as utilsAddLogEntry,
    SYSTEM_LOGS_COLLECTION,
    LogType,
    getDeviceInfo
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
    // แสดง log เฉพาะในโหมด development
    devLog(`[BPK-LOG] User logged in: ${user.username} (${user.uid}) with role: ${user.role}`);
    
    // สร้าง safe user object สำหรับ server action
    const safeUser = createSafeUserObject(user);
    
    // บันทึก log ในฝั่ง server
    await logServerAction('login', safeUser, {
      timestamp: new Date().toISOString(),
      userAgent: userAgent || navigator.userAgent
    });
    
    // บันทึก log ในฐานข้อมูล
    await utilsLogLogin(
      user.uid, 
      user.username, 
      userAgent || navigator.userAgent
    );
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
    // แสดง log เฉพาะในโหมด development
    devLog(`[BPK-LOG] User logged out: ${user.username} (${user.uid}) with role: ${user.role}`);
    
    // สร้าง safe user object สำหรับ server action
    const safeUser = createSafeUserObject(user);
    
    // บันทึก log ในฝั่ง server
    await logServerAction('logout', safeUser, {
      timestamp: new Date().toISOString(),
      userAgent: userAgent || navigator.userAgent
    });
    
    // บันทึก log ในฐานข้อมูล
    await utilsLogLogout(
      user.uid, 
      user.username, 
      userAgent || navigator.userAgent
    );
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
    // แสดง log เฉพาะในโหมด development
    devLog(`[BPK-LOG] User ${user.username || user.uid} (${user.role}) accessed page: ${page}`);
    
    // สร้าง safe user object สำหรับ server action
    const safeUser = createSafeUserObject(user);
    
    // บันทึก log ในฝั่ง server
    await logServerAction('page_access', safeUser, {
      page,
      timestamp: new Date().toISOString(),
      userAgent: userAgent || navigator.userAgent
    });
    
    // ใช้ addLogEntry แทนเนื่องจากไม่มีฟังก์ชัน logPageAccess ใน logUtils
    const deviceInfo = getDeviceInfo();

    await utilsAddLogEntry({
      type: 'page.access', // สร้าง type ใหม่สำหรับการเข้าถึงหน้า
      userId: user.uid,
      username: user.username,
      details: {
        page,
        timestamp: new Date().toISOString(),
        deviceType: deviceInfo.deviceType,
        browserName: deviceInfo.browserName,
        role: user.role
      },
      userAgent: userAgent || navigator.userAgent
    }, SYSTEM_LOGS_COLLECTION);
  } catch (error) {
    console.error('Failed to log page access:', error);
  }
}; 