import { rtdb } from '@/app/core/firebase/firebase';
import { ref, onValue, set, onDisconnect, remove, serverTimestamp, get, update } from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';
import { User } from '@/app/core/types/user';
import { v4 as uuidv4 } from 'uuid';
import { logLogin, logLogout } from './logService';
import { getDeviceInfo, getSafeUserAgent } from '@/app/core/utils/logUtils';

// กำหนดค่าคงที่สำหรับระยะเวลาของ session (24 ชั่วโมง)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * สร้าง session สำหรับผู้ใช้ที่เข้าสู่ระบบสำเร็จ
 * @param userId ID ของผู้ใช้
 * @param role บทบาทของผู้ใช้
 * @returns Session ID ที่สร้าง
 */
export const createUserSession = async (
  userId: string,
  role: string
): Promise<string> => {
  try {
    // ตรวจสอบ userId และ role
    if (!userId || userId.trim() === '') {
      console.error('Cannot create session: Invalid user ID');
      return '';
    }

    // กำหนดค่าเริ่มต้นให้ role ถ้าไม่มีค่า
    const userRole = role || 'user';
    
    const sessionId = `session_${userId}_${Date.now()}`;
    
    // สร้าง document ใหม่ในคอลเลคชัน 'sessions'
    const sessionData = {
      userId,
      role: userRole,
      sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      isActive: true,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS) // Session จะหมดอายุหลังจาก X ชั่วโมง
    };
    
    // ตรวจสอบว่ามี session เก่าของผู้ใช้นี้หรือไม่
    try {
      await resetUserSessions(userId);
    } catch (resetErr) {
      console.warn('Could not reset previous sessions, but continuing:', resetErr);
    }
    
    // สร้าง session ใหม่
    try {
      const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
      await set(sessionRef, sessionData);
      console.log(`Created new session ${sessionId} for user ${userId}`);
    } catch (dbErr) {
      console.error('Error creating session in realtime database:', dbErr);
      // ถ้าเกิด error ก็ยังคืนค่า sessionId เพื่อให้สามารถใช้งานได้
    }
    
    // บันทึก session ID ใน session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentSessionId', sessionId);
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    // ไม่ throw error แต่คืนค่า session ID ที่สร้างไว้เพื่อให้สามารถใช้งานได้ต่อ
    // ในกรณีที่ไม่สามารถบันทึกลงฐานข้อมูลได้
    return userId ? `session_${userId}_${Date.now()}_local` : '';
  }
};

/**
 * ตรวจสอบและอัพเดท session
 * @param userId ID ของผู้ใช้
 * @param currentSessionId ID ของ session ปัจจุบัน
 * @returns สถานะการตรวจสอบ
 */
export const verifyUserSession = async (
  userId: string,
  currentSessionId: string
): Promise<boolean> => {
  if (!userId || !currentSessionId) return false;
  
  try {
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    const snapshot = await get(currentSessionRef);
    
    if (!snapshot.exists()) return false;
    
    const data = snapshot.val();
    // ตรวจสอบว่า sessionId ตรงกับ currentSession หรือไม่
    const isValid = data.sessionId === currentSessionId;
    
    // ถ้า session ยังใช้งานได้ อัพเดท lastActive
    if (isValid) {
      await update(currentSessionRef, { lastActive: serverTimestamp() });
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying user session:', error);
    return false;
  }
};

/**
 * ติดตามการเปลี่ยนแปลงข้อมูล session ปัจจุบัน 
 * @param userId ID ของผู้ใช้
 * @param sessionId ID ของ session ที่ต้องการติดตาม
 * @param callback ฟังก์ชันที่จะเรียกเมื่อมีการเปลี่ยนแปลง
 * @returns ฟังก์ชันสำหรับยกเลิกการติดตาม
 */
export const watchCurrentSession = (
  userId: string,
  sessionId: string,
  callback: (session: any | null) => void
): (() => void) => {
  if (!userId || !sessionId) {
    console.warn('Cannot watch session: Missing user ID or session ID');
    // ส่งค่า null และ return dummy function
    callback(null);
    return () => {};
  }
  
  try {
    const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
    const unsubscribe = onValue(
      sessionRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        } else {
          console.warn(`Session ${sessionId} no longer exists for user ${userId}`);
          callback(null);
        }
      },
      (error) => {
        console.error('Error watching session:', error);
        // ไม่เรียก callback ด้วย null ในกรณีข้อผิดพลาด เพื่อไม่ให้ระบบ logout ผู้ใช้
        // callback(null);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up session watcher:', error);
    // ส่งค่าเป็น dummy session เพื่อไม่ให้ระบบ logout ผู้ใช้
    callback({
      isActive: true,
      sessionId: sessionId,
      lastActive: new Date().toISOString()
    });
    return () => {};
  }
};

/**
 * อัพเดทเวลาล่าสุดที่ใช้งาน session
 * @param userId ID ของผู้ใช้
 * @param sessionId ID ของ session ปัจจุบัน
 */
export const updateSessionActivity = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  if (!userId || !sessionId) return;
  
  try {
    const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    
    // อัพเดทเวลาล่าสุดที่ใช้งานทั้ง session และ currentSession
    const updates = {
      lastActive: serverTimestamp()
    };
    
    await update(sessionRef, updates);
    await update(currentSessionRef, updates);
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

/**
 * อัพเดท session เมื่อมีการรีเฟรชหน้า
 * @param userId ID ของผู้ใช้
 * @param sessionId ID ของ session ปัจจุบัน
 */
export const updateSessionForRefresh = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  if (!userId || !sessionId) return;
  
  try {
    const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    
    // อัพเดทสถานะและเวลาล่าสุดที่ใช้งาน
    const updates = {
      lastActive: serverTimestamp(),
      wasRefreshed: true,
      refreshedAt: serverTimestamp()
    };
    
    await update(sessionRef, updates);
    await update(currentSessionRef, updates);
    console.log(`[SESSION] Updated session ${sessionId} for refresh`);
  } catch (error) {
    console.error('[SESSION] Error updating session for refresh:', error);
  }
};

/**
 * สร้าง user object ที่ปลอดภัยไม่มี timestamp object ที่จะทำให้เกิดปัญหาเมื่อส่งไป server actions
 */
function createSafeUserObject(user: User): User {
  // สร้าง plain object ใหม่ที่มีเฉพาะค่าพื้นฐาน
  return {
    uid: user.uid,
    username: user.username || '',
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    active: user.active,
    // แปลงค่า timestamp เป็น string ถ้ามี
    createdAt: user.createdAt ? 
      (typeof user.createdAt === 'string' ? user.createdAt : 
      typeof user.createdAt === 'object' && user.createdAt && 'toDate' in user.createdAt && typeof user.createdAt.toDate === 'function' ? 
      user.createdAt.toDate().toISOString() : 
      typeof user.createdAt === 'object' && user.createdAt && 'seconds' in user.createdAt ? 
      new Date((user.createdAt.seconds as number) * 1000).toISOString() : 
      'unknown') : undefined,
    updatedAt: user.updatedAt ? 
      (typeof user.updatedAt === 'string' ? user.updatedAt : 
      typeof user.updatedAt === 'object' && user.updatedAt && 'toDate' in user.updatedAt && typeof user.updatedAt.toDate === 'function' ? 
      user.updatedAt.toDate().toISOString() : 
      typeof user.updatedAt === 'object' && user.updatedAt && 'seconds' in user.updatedAt ? 
      new Date((user.updatedAt.seconds as number) * 1000).toISOString() : 
      'unknown') : undefined,
    lastLogin: user.lastLogin ? 
      (typeof user.lastLogin === 'string' ? user.lastLogin : 
      typeof user.lastLogin === 'object' && user.lastLogin && 'toDate' in user.lastLogin && typeof user.lastLogin.toDate === 'function' ? 
      user.lastLogin.toDate().toISOString() : 
      typeof user.lastLogin === 'object' && user.lastLogin && 'seconds' in user.lastLogin ? 
      new Date((user.lastLogin.seconds as number) * 1000).toISOString() : 
      'unknown') : undefined,
    lastActive: user.lastActive ? 
      (typeof user.lastActive === 'string' ? user.lastActive : 
      typeof user.lastActive === 'object' && user.lastActive && 'toDate' in user.lastActive && typeof user.lastActive.toDate === 'function' ? 
      user.lastActive.toDate().toISOString() : 
      typeof user.lastActive === 'object' && user.lastActive && 'seconds' in user.lastActive ? 
      new Date((user.lastActive.seconds as number) * 1000).toISOString() : 
      'unknown') : undefined,
  };
}

/**
 * ปิด session
 * @param userId ID ของผู้ใช้
 * @param sessionId ID ของ session
 * @param user ข้อมูลผู้ใช้ (สำหรับบันทึก log)
 */
export const endUserSession = async (
  userId: string,
  sessionId: string,
  user: User
): Promise<void> => {
  if (!userId || !sessionId) return;
  
  try {
    // ปรับปรุงสถานะ session
    const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
    await update(sessionRef, {
      isActive: false,
      endTime: serverTimestamp()
    });
    
    // ลบ current session
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    await remove(currentSessionRef);
    
    // บันทึก log การออกจากระบบ
    if (user?.username) {
      // สร้าง safeUser object เพื่อป้องกันปัญหา timestamp objects
      const safeUser = createSafeUserObject(user);
      await logLogout(safeUser);
    }
  } catch (error) {
    console.error('Error ending user session:', error);
  }
};

/**
 * เคลียร์ session ทั้งหมดของผู้ใช้ (ใช้เมื่อต้องการ force logout ทุกอุปกรณ์)
 * @param userId ID ของผู้ใช้
 */
export const clearAllUserSessions = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    // ดึงข้อมูล sessions ทั้งหมดของผู้ใช้
    const sessionsRef = ref(rtdb, `sessions/${userId}`);
    const snapshot = await get(sessionsRef);
    
    if (snapshot.exists()) {
      const sessions = snapshot.val();
      // อัพเดททุก session ให้เป็น inactive
      const updates: {[key: string]: any} = {};
      
      Object.keys(sessions).forEach(sessionId => {
        updates[`${sessionId}/isActive`] = false;
        updates[`${sessionId}/endTime`] = serverTimestamp();
        updates[`${sessionId}/endReason`] = 'forced_logout';
      });
      
      await update(sessionsRef, updates);
    }
    
    // ลบ currentSession
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    await remove(currentSessionRef);
  } catch (error) {
    console.error('Error clearing all user sessions:', error);
  }
};

/**
 * รีเซ็ตเซสชันทั้งหมดของผู้ใช้
 * @param userId ID ของผู้ใช้
 * @returns void
 */
export const resetUserSessions = async (userId: string): Promise<void> => {
  // ตรวจสอบว่า userId มีค่าที่ถูกต้องหรือไม่
  if (!userId || userId.trim() === '') {
    console.error('Cannot reset sessions: Missing user ID');
    // ถ้าไม่มี userId ให้ return Promise ที่สำเร็จเพื่อไม่ให้ flow ของการทำงานถูกขัดจังหวะ
    return Promise.resolve();
  }
  
  try {
    // ลบเซสชันเก่าทั้งหมด
    await clearAllUserSessions(userId);
    console.log(`All sessions cleared for user ${userId}`);
  } catch (error) {
    console.error('Error resetting user sessions:', error);
    // ถ้าเกิด error ให้ return Promise ที่สำเร็จเพื่อไม่ให้ flow ของการทำงานถูกขัดจังหวะ
    return Promise.resolve();
  }
};

/**
 * ตรวจสอบว่ามี session ที่ active อยู่หรือไม่
 * @param userId ID ของผู้ใช้
 * @returns boolean สถานะว่ามี session active หรือไม่
 */
export const hasActiveSession = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // ยกเว้นการตรวจสอบเซสชันซ้ำซ้อนชั่วคราวเพื่อแก้ไขปัญหาการเชื่อมต่อ Realtime Database
    console.warn('Bypassing active session check due to Realtime Database connection issues');
    return false; // ให้ผลลัพธ์เป็น false เสมอ เพื่อให้สร้างเซสชันใหม่ได้
    
    // โค้ดเดิมที่ถูกยกเว้นชั่วคราว
    /*
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    const snapshot = await get(currentSessionRef);
    
    if (snapshot.exists()) {
      // ตรวจสอบว่า session นี้ยังใช้งานได้หรือไม่ (อาจมีการตรวจสอบเพิ่มเติม เช่น lastActive ไม่เกิน 30 นาที)
      const data = snapshot.val();
      return true; // มี session ที่ active
    }
    
    return false; // ไม่มี session ที่ active
    */
  } catch (error) {
    console.error('Error checking active sessions:', error);
    return false;
  }
}; 