import { User } from '@/app/core/types/user';
import { logLogin as utilsLogLogin, logLogout as utilsLogLogout } from '@/app/core/utils/logUtils';

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
  if (!user?.uid || !user?.username) {
    console.error('Cannot log page access: User data is incomplete');
    return;
  }

  try {
    // ใช้ addLogEntry แทนเนื่องจากไม่มีฟังก์ชัน logPageAccess ใน logUtils
    const { addLogEntry, LogType, getDeviceInfo } = await import('@/app/core/utils/logUtils');
    const deviceInfo = getDeviceInfo();

    await addLogEntry({
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
    });
  } catch (error) {
    console.error('Failed to log page access:', error);
  }
}; 