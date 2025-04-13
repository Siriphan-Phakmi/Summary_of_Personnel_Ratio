import { User } from '@/app/core/types/user';
import { logLogout } from './logService';
import { clearAuthCookies } from '@/app/core/utils/authUtils';
import toast from 'react-hot-toast';
import { endUserSession } from './sessionService';

/**
 * ทำการออกจากระบบ
 * @param user ข้อมูลผู้ใช้
 * @param onLogoutComplete ฟังก์ชันที่จะเรียกเมื่อออกจากระบบเสร็จสมบูรณ์
 */
export const logoutUser = async (
  user: User | null, 
  onLogoutComplete?: () => void
): Promise<void> => {
  try {
    // 1. ปิด session ถ้ามีข้อมูล user และ session
    if (user?.uid) {
      const sessionId = sessionStorage.getItem('currentSessionId');
      if (sessionId) {
        try {
          await endUserSession(user.uid, sessionId, user);
          console.log(`Session ${sessionId} closed for user ${user.uid}`);
        } catch (error) {
          console.error('Error ending session:', error);
          // ไม่ return เพื่อให้ล้าง cookies ต่อไปได้
        }
      } 
    }
    
    // 2. ล้าง cookies และ cache ทั้งหมดที่เกี่ยวข้องกับการ authentication
    clearAuthCookies();
    console.log('Auth cookies and cache cleared');
    
    // 3. ลบ session ID จาก sessionStorage (เพิ่มความมั่นใจว่าถูกลบแน่นอน)
    sessionStorage.removeItem('currentSessionId');
    
    // 4. ลบข้อมูลที่เกี่ยวข้องกับการ login อื่นๆ
    if (typeof window !== 'undefined') {
      // ลบข้อมูล user จาก local storage (ถ้ามี)
      localStorage.removeItem('lastLoginUser');
      localStorage.removeItem('rememberUser');
    }
    
    // 5. เรียก callback หลังจากออกจากระบบเสร็จสมบูรณ์
    if (onLogoutComplete) {
      onLogoutComplete();
    }
  } catch (error) {
    console.error('Error during logout process:', error);
    // ถึงแม้จะมี error ก็ยังเรียก callback เพื่อให้ UI แสดงว่า logout แล้ว
    if (onLogoutComplete) {
      onLogoutComplete();
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
      if (key.startsWith('session_') || key.startsWith('user_data_') || key === 'currentSessionId') {
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
    // 1. ปิด session ปัจจุบัน
    const sessionId = sessionStorage.getItem('currentSessionId');
    if (sessionId) {
      // สร้าง minimal user object สำหรับ log
      const minimalUser: User = {
        uid: userId,
        role: 'user' // ใส่ค่าเริ่มต้นสำหรับ required field
      };
      await endUserSession(userId, sessionId, minimalUser);
    }
    
    // 2. ลบข้อมูล session จาก sessionStorage
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