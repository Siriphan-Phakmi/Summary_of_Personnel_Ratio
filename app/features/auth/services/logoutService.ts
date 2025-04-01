import { User } from '@/app/core/types/user';
import { logLogout } from './logService';
import { clearAuthCookies } from '@/app/core/utils/authUtils';
import toast from 'react-hot-toast';
import { endUserSession } from './sessionService';

/**
 * ทำการ logout ผู้ใช้
 * @param user ข้อมูลผู้ใช้ที่กำลังล็อกเอาท์
 * @param callback ฟังก์ชันที่จะเรียกหลังจาก logout เสร็จ (เช่น redirect)
 */
export const logoutUser = async (
  user: User | null, 
  callback?: () => void
): Promise<void> => {
  try {
    // 1. เคลียร์ข้อมูลใน sessionStorage และ cookies
    if (typeof window !== 'undefined') {
      // ล้าง cookies ที่ใช้ในระบบใหม่
      clearAuthCookies();
      
      // ล้าง sessionStorage (สำหรับความเข้ากันได้กับระบบเดิม)
      if (user?.uid) {
        sessionStorage.removeItem(`session_${user.uid}`);
        sessionStorage.removeItem(`user_data_${user.uid}`);
      }
      sessionStorage.removeItem('lastActive');
    }
    
    // 2. บันทึก log การ logout
    if (user) {
      try {
        await logLogout(user);
      } catch (logErr) {
        console.error('Error logging logout:', logErr);
      }
    }
    
    // 3. แสดง notification ว่า logout สำเร็จ
    toast.success('ออกจากระบบสำเร็จ');
    
    // 4. เรียกใช้ callback ถ้ามี
    if (callback) {
      callback();
    }
  } catch (err) {
    console.error('Error during logout:', err);
    
    // ถ้าเกิดข้อผิดพลาด ก็ยังเรียก callback เพื่อให้การ logout เสร็จสิ้น
    if (callback) {
      callback();
    }
  }
};

/**
 * ล้างข้อมูล session ทั้งหมด
 */
export const clearAllSessions = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // ล้าง cookies ที่ใช้ในระบบใหม่
    clearAuthCookies();
    
    // ล้าง sessionStorage สำหรับระบบเดิม
    const allKeys = Object.keys(sessionStorage);
    
    // ค้นหาและลบข้อมูลที่เกี่ยวข้องกับ session
    allKeys.forEach(key => {
      if (key.startsWith('session_') || key.startsWith('user_data_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // ลบข้อมูลเวลาทำกิจกรรมล่าสุด
    sessionStorage.removeItem('lastActive');
  } catch (error) {
    console.error('Error clearing sessions:', error);
  }
};

/**
 * ออกจากระบบและล้างข้อมูล session
 * @param userId ID ของผู้ใช้ที่ต้องการออกจากระบบ
 * @returns ผลลัพธ์การออกจากระบบ
 */
export const logout = async (userId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  console.log('Logging out user:', userId);
  
  try {
    // 1. ลบข้อมูล session ในระบบใหม่ (Realtime Database)
    const sessionId = sessionStorage.getItem('currentSessionId');
    if (sessionId) {
      // ดึงข้อมูลผู้ใช้จาก sessionStorage
      const userData = sessionStorage.getItem(`user_data_${userId}`);
      if (userData) {
        const user = JSON.parse(userData) as User;
        await endUserSession(userId, sessionId, user);
      } else {
        // กรณีไม่มีข้อมูลผู้ใช้ สร้าง minimal user object
        const minimalUser: User = {
          uid: userId,
          role: 'user' // ใส่ค่าเริ่มต้นสำหรับ required field
        };
        await endUserSession(userId, sessionId, minimalUser);
      }
    }
    
    // 2. ลบข้อมูล session จาก sessionStorage (สำหรับ backward compatibility)
    sessionStorage.removeItem(`session_${userId}`);
    sessionStorage.removeItem(`user_data_${userId}`);
    sessionStorage.removeItem('currentSessionId');
    
    // 3. ลบข้อมูล cookie
    clearAuthCookies();
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during logout'
    };
  }
}; 