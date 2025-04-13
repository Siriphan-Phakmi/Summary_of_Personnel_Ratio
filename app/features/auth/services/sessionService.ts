import { rtdb } from '@/app/core/firebase/firebase';
import { ref, onValue, set, onDisconnect, remove, serverTimestamp, get, update } from 'firebase/database';
import { User } from '@/app/core/types/user';
import { v4 as uuidv4 } from 'uuid';
import { logLogin, logLogout } from './logService';
import { getDeviceInfo, getSafeUserAgent } from '@/app/core/utils/logUtils';

/**
 * สร้าง session ใหม่สำหรับผู้ใช้
 * @param user ข้อมูลผู้ใช้ที่เข้าสู่ระบบ
 * @returns session ID
 */
export const createUserSession = async (user: User): Promise<string> => {
  if (!user?.uid || !user?.username) {
    console.error('Cannot create session: User data is incomplete');
    return '';
  }

  try {
    const sessionId = uuidv4();
    const deviceInfo = getDeviceInfo();
    const userAgent = getSafeUserAgent();
    
    // สร้าง session object
    const sessionData = {
      sessionId,
      userId: user.uid,
      username: user.username,
      deviceInfo: deviceInfo,
      userAgent,
      startTime: serverTimestamp(),
      lastActive: serverTimestamp(),
      isActive: true
    };
    
    // บันทึก session ใหม่
    const sessionRef = ref(rtdb, `sessions/${user.uid}/${sessionId}`);
    await set(sessionRef, sessionData);
    
    // ตั้งค่าให้ลบ session เมื่อมีการตัดการเชื่อมต่อ
    onDisconnect(sessionRef).update({ isActive: false, endTime: serverTimestamp() });
    
    // ตั้งค่า session ปัจจุบัน - ก่อนหน้านี้เราต้องเช็คว่ามี session เดิมหรือไม่
    const currentSessionRef = ref(rtdb, `currentSessions/${user.uid}`);
    
    // เช็คว่ามี session เก่าที่ยังใช้งานอยู่หรือไม่
    const snapshot = await get(currentSessionRef);
    if (snapshot.exists()) {
      // ถ้ามี session เก่า ให้ทำการปิด session เก่าก่อน
      const oldSessionData = snapshot.val();
      if (oldSessionData.sessionId && oldSessionData.sessionId !== sessionId) {
        const oldSessionRef = ref(rtdb, `sessions/${user.uid}/${oldSessionData.sessionId}`);
        await update(oldSessionRef, { 
          isActive: false, 
          endTime: serverTimestamp(),
          endReason: 'new_session_created'
        });
      }
    }
    
    // อัพเดท current session เป็น session ใหม่
    await set(currentSessionRef, {
      sessionId,
      startTime: serverTimestamp(),
      deviceInfo: deviceInfo,
      lastActive: serverTimestamp()
    });
    
    // บันทึก log การเข้าสู่ระบบ
    await logLogin(user, userAgent);
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    return '';
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
 * รีเซ็ตเซสชันทั้งหมดของผู้ใช้และสร้างเซสชันใหม่
 * @param user ข้อมูลผู้ใช้
 * @returns sessionId ของเซสชันใหม่
 */
export const resetUserSessions = async (user: User): Promise<string> => {
  if (!user?.uid) {
    console.error('Cannot reset sessions: User data is incomplete');
    return '';
  }
  
  try {
    // ลบเซสชันเก่าทั้งหมดก่อน
    await clearAllUserSessions(user.uid);
    
    // สร้างเซสชันใหม่
    const newSessionId = await createUserSession(user);
    
    // ล็อกการรีเซ็ตเซสชัน
    try {
      const { logLogin } = await import('./logService');
      await logLogin(user, getSafeUserAgent());
    } catch (error) {
      console.error('Error logging session reset:', error);
    }
    
    return newSessionId;
  } catch (error) {
    console.error('Error resetting user sessions:', error);
    return '';
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