'use server';

import { User } from '@/app/core/types/user';

/**
 * บันทึก log ในฝั่ง server (จะแสดงใน terminal ของ npm run dev)
 * 
 * @param action ประเภทการกระทำ (login, logout, page_access)
 * @param user ข้อมูลผู้ใช้ (ถ้ามี)
 * @param details รายละเอียดเพิ่มเติม
 */
export async function logServerAction(
  action: 'login' | 'logout' | 'page_access',
  user: Partial<User> | null, 
  details: Record<string, any> = {}
): Promise<void> {
  // สร้าง timestamp
  const timestamp = new Date().toISOString();
  
  // สร้าง log message
  let logMessage = `[BPK-SERVER-ACTION] ${timestamp} | ${action}`;
  
  // เพิ่มข้อมูลผู้ใช้ (ถ้ามี)
  if (user) {
    logMessage += ` | User: ${user.username || user.uid || 'unknown'} (${user.role || 'unknown role'})`;
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
  
  // อาจเพิ่มการบันทึกลงฐานข้อมูลที่นี่ได้ในอนาคต
} 