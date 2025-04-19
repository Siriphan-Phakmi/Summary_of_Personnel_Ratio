'use server';

import { User } from '@/app/core/types/user';

/**
 * สร้าง user object ที่ปลอดภัยสำหรับ server action (ไม่มี complex objects)
 */
function createSafeUserObject(user: Partial<User> | null): Record<string, any> | null {
  if (!user) return null;
  
  // ฟังก์ชันช่วยแปลง timestamp เป็น string
  const formatTimestamp = (timestamp: any): string => {
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp instanceof Date) return timestamp.toISOString();
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
    if (timestamp && 'seconds' in timestamp) return new Date((timestamp.seconds as number) * 1000).toISOString();
    return 'unknown';
  };
  
  // สร้าง plain object ใหม่ที่มีเฉพาะค่าพื้นฐาน
  return {
    uid: user.uid,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    active: user.active,
    createdAt: user.createdAt ? formatTimestamp(user.createdAt) : undefined,
    updatedAt: user.updatedAt ? formatTimestamp(user.updatedAt) : undefined,
  };
}

/**
 * บันทึก log ในฝั่ง server (จะแสดงใน terminal ของ npm run dev)
 * 
 * @param action ประเภทการกระทำ (login, logout, page_access)
 * @param user ข้อมูลผู้ใช้ (ถ้ามี)
 * @param details รายละเอียดเพิ่มเติม
 */
export async function logServerAction(
  action: 
    | 'login' 
    | 'logout' 
    | 'page_access'
    | 'activate_user'
    | 'deactivate_user'
    | 'status_change_failed'
    | 'update_user'
    | 'create_user'
    | 'update_user_failed'
    | 'create_user_failed'
    | 'delete_user',
  user: Partial<User> | null, 
  details: Record<string, any> = {}
): Promise<void> {
  try {
    // สร้าง timestamp
    const timestamp = new Date().toISOString();
    
    // แปลง user เป็น safe object
    const safeUser = createSafeUserObject(user);
    
    // สร้าง log message
    let logMessage = `[BPK-SERVER-ACTION] ${timestamp} | ${action}`;
    
    // เพิ่มข้อมูลผู้ใช้ (ถ้ามี)
    if (safeUser) {
      logMessage += ` | User: ${safeUser.username || safeUser.uid || 'unknown'} (${safeUser.role || 'unknown role'})`;
    } else {
      logMessage += ` | User: anonymous`;
    }
    
    // เพิ่มรายละเอียดอื่นๆ
    if (Object.keys(details).length > 0) {
      logMessage += ` | Details: ${JSON.stringify(details)}`;
    }
    
    // แสดง log ในฝั่ง server เฉพาะใน development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(logMessage);
    }
  } catch (error) {
    console.error('Error in logServerAction:', error);
  }
} 