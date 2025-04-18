import { User } from '@/app/core/types/user';
import { logLogout } from './logService';
import { clearAuthCookies } from '@/app/core/utils/authUtils';
import toast from 'react-hot-toast';
import { endUserSession } from './sessionService';
import { useRouter } from 'next/navigation';
import { ref, update, serverTimestamp, get } from 'firebase/database';
import { rtdb, db } from '@/app/core/firebase/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { dismissAllToasts } from '@/app/core/utils/toastUtils';

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
    // 0. ลบ toast notifications ทั้งหมด
    dismissAllToasts();
    
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
    // ลบ toast notifications ทั้งหมด
    dismissAllToasts();
    
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
 * ออกจากระบบและล้างข้อมูลที่เกี่ยวข้อง
 * @param user ข้อมูลผู้ใช้ที่กำลังออกจากระบบ
 * @returns void
 */
export const logout = async (user?: User | null): Promise<void> => {
  try {
    console.log('Logout called with user:', user ? 
      { uid: user.uid, username: user.username, role: user.role } : 
      'No user provided');
      
    // ลบ toast notifications ทั้งหมด
    dismissAllToasts();
      
    // เช็คว่ามีข้อมูลผู้ใช้หรือไม่
    if (!user?.uid) {
      console.log('No user data available for logout');
      // ล้าง cookies และ session storage ถึงแม้ไม่มีข้อมูลผู้ใช้
      clearAuthCookies();
      return;
    }
    
    console.log('Logging out user:', user.username || user.uid);
    
    // อัพเดทสถานะล่าสุดก่อนออกจากระบบ
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // ตรวจสอบว่าเอกสารมีอยู่จริงก่อนอัปเดต
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // เอกสารมีอยู่จริง จึงอัพเดต
        await updateDoc(userRef, {
          lastActive: new Date()
        });
        console.log(`Updated lastActive for user ${user.uid}`);
      } else {
        // เอกสารไม่มีอยู่ ไม่สามารถอัพเดตได้
        console.warn(`Cannot update lastActive: User document with ID ${user.uid} does not exist`);
      }
    } catch (err) {
      console.error('Error updating last active time:', err);
      // ไม่ throw error เพื่อให้กระบวนการออกจากระบบยังคงดำเนินต่อไป
    }
    
    // ปิด session ที่กำลังใช้งาน
    try {
      const currentSessionId = sessionStorage.getItem('currentSessionId');
      
      if (currentSessionId) {
        console.log('Found active session:', currentSessionId);
        const sessionRef = ref(rtdb, `sessions/${user.uid}/${currentSessionId}`);
        
        // อัพเดทสถานะ session เป็นไม่ได้ใช้งาน
        await update(sessionRef, {
          isActive: false,
          endTime: serverTimestamp(),
          endReason: 'user_logout'
        });
        
        console.log('Session updated to inactive');
      } else {
        console.log('No active session found for user:', user.uid);
      }
    } catch (sessionErr) {
      console.error('Error closing session:', sessionErr);
      // ไม่ throw error เพื่อให้กระบวนการออกจากระบบยังคงดำเนินต่อไป
    }
    
    // บันทึก log การออกจากระบบ
    try {
      await logLogout(user);
      console.log('Logout logged successfully');
    } catch (logErr) {
      console.error('Error logging logout:', logErr);
      // ไม่ throw error เพื่อให้กระบวนการออกจากระบบยังคงดำเนินต่อไป
    }
    
    // ล้าง cookies และ local storage
    clearAuthCookies();
    
    console.log('Logout process completed for user:', user.username || user.uid);
  } catch (err) {
    console.error('Error during logout:', err);
    
    // เพื่อความปลอดภัย ล้าง cookies และ storage แม้จะมีข้อผิดพลาด
    clearAuthCookies();
    
    throw new Error('เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง');
  }
};

// Export as an object with the logout method
export const logoutService = {
  logout
}; 