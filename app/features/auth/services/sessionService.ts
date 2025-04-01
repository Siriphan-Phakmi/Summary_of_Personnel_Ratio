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
      deviceInfo,
      userAgent,
      startTime: serverTimestamp(),
      lastActive: serverTimestamp(),
      isActive: true
    };
    
    // บันทึก session ใหม่
    const sessionRef = ref(rtdb, `sessions/${user.uid}/${sessionId}`);
    await set(sessionRef, sessionData);
    
    // ตั้งค่าให้ลบ session เมื่อมีการตัดการเชื่อมต่อ
    onDisconnect(sessionRef).update({ isActive: false });
    
    // ตั้งค่า session ปัจจุบัน
    const currentSessionRef = ref(rtdb, `currentSessions/${user.uid}`);
    await set(currentSessionRef, {
      sessionId,
      startTime: serverTimestamp(),
      deviceInfo
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
    return data.sessionId === currentSessionId;
  } catch (error) {
    console.error('Error verifying user session:', error);
    return false;
  }
};

/**
 * ตรวจสอบการเปลี่ยนแปลงของ session ปัจจุบัน (ใช้สำหรับตรวจจับการ login ซ้ำซ้อน)
 * @param userId ID ของผู้ใช้
 * @param currentSessionId ID ของ session ปัจจุบัน
 * @param callback ฟังก์ชันที่จะเรียกเมื่อมีการเปลี่ยนแปลง
 * @returns ฟังก์ชัน unsubscribe
 */
export const watchCurrentSession = (
  userId: string,
  currentSessionId: string,
  callback: (isValid: boolean) => void
): (() => void) => {
  if (!userId || !currentSessionId) {
    callback(false);
    return () => {};
  }
  
  const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
  
  // ติดตามการเปลี่ยนแปลงของ currentSession
  const unsubscribe = onValue(currentSessionRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(false);
      return;
    }
    
    const data = snapshot.val();
    const isValid = data.sessionId === currentSessionId;
    callback(isValid);
  });
  
  return unsubscribe;
};

/**
 * อัพเดทเวลาใช้งานล่าสุดของ session
 * @param userId ID ของผู้ใช้
 * @param sessionId ID ของ session
 */
export const updateSessionActivity = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  if (!userId || !sessionId) return;
  
  try {
    const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
    await update(sessionRef, {
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

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
      await logLogout(user);
    }
  } catch (error) {
    console.error('Error ending user session:', error);
  }
};

/**
 * ลบ session ทั้งหมดของผู้ใช้
 * @param userId ID ของผู้ใช้
 */
export const clearAllUserSessions = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    // ลบ sessions ทั้งหมด
    const sessionsRef = ref(rtdb, `sessions/${userId}`);
    await remove(sessionsRef);
    
    // ลบ current session
    const currentSessionRef = ref(rtdb, `currentSessions/${userId}`);
    await remove(currentSessionRef);
  } catch (error) {
    console.error('Error clearing all user sessions:', error);
  }
}; 