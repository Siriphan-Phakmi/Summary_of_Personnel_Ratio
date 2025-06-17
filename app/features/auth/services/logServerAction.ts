'use server';

import { User } from '../types/user';
import { createSafeUserObject } from '../utils/userUtils';

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