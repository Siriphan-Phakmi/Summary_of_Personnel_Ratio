'use client';

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { User } from '@/app/features/auth/types/user';

/**
 * User State Interface - ระบบจัดการ state ชั่วคราวของผู้ใช้
 */
export interface UserState {
  // Session state
  sessionStartTime?: Date;
  lastActiveTime?: Date;
  deviceInfo?: string;
  
  // Notification state
  lastNotificationDate?: string;
  dismissedNotifications?: string[];
  
  // Form state
  lastVisitedWard?: string;
  lastSelectedDate?: string;
  lastSelectedShift?: 'morning' | 'night';
  
  // UI state
  sidebarCollapsed?: boolean;
  lastViewedPage?: string;
  
  // Temporary flags
  hasSeenWelcomeMessage?: boolean;
  hasCompletedTutorial?: boolean;
  
  // Metadata
  createdAt?: Date | FieldValue;
  updatedAt?: Date | FieldValue;
  expiresAt?: Date; // Auto-cleanup after 7 days
}

/**
 * ดึง state ของผู้ใช้จาก Firebase
 * @param user ข้อมูลผู้ใช้
 * @returns User state หรือ null ถ้าไม่มี
 */
export const getUserState = async (user: User): Promise<UserState | null> => {
  try {
    if (!user?.uid) {
      console.warn('[UserStateService] No user UID provided');
      return null;
    }

    const stateDocRef = doc(db, 'userStates', user.uid);
    const stateDoc = await getDoc(stateDocRef);
    
    if (stateDoc.exists()) {
      const data = stateDoc.data();
      
      // ตรวจสอบว่า state หมดอายุหรือไม่
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        await deleteUserState(user);
        return null;
      }
      
      return {
        ...data,
        sessionStartTime: data.sessionStartTime?.toDate(),
        lastActiveTime: data.lastActiveTime?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('[UserStateService] Error getting user state:', error);
    return null;
  }
};

/**
 * บันทึก state ของผู้ใช้ลง Firebase
 * @param user ข้อมูลผู้ใช้
 * @param state state ที่ต้องการบันทึก
 */
export const setUserState = async (
  user: User, 
  state: Partial<UserState>
): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[UserStateService] No user UID provided');
      return;
    }

    const stateDocRef = doc(db, 'userStates', user.uid);
    
    // กำหนดเวลาหมดอายุ 7 วันจากตอนนี้
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const stateToSave = {
      ...state,
      updatedAt: serverTimestamp(),
      expiresAt,
    };

    // ถ้าเป็นการสร้าง state ใหม่ ให้เพิ่ม createdAt
    const existingState = await getUserState(user);
    if (!existingState) {
      stateToSave.createdAt = serverTimestamp();
    }

    await setDoc(stateDocRef, stateToSave, { merge: true });
    
  } catch (error) {
    console.error('[UserStateService] Error saving user state:', error);
    throw error;
  }
};

/**
 * อัพเดท state เฉพาะด้าน
 * @param user ข้อมูลผู้ใช้
 * @param key คีย์ของ state
 * @param value ค่าใหม่
 */
export const updateUserState = async <K extends keyof UserState>(
  user: User,
  key: K,
  value: UserState[K]
): Promise<void> => {
  try {
    const stateUpdate = { [key]: value } as Partial<UserState>;
    await setUserState(user, stateUpdate);
    
  } catch (error) {
    console.error('[UserStateService] Error updating user state:', error);
    throw error;
  }
};

/**
 * ลบ state ของผู้ใช้
 * @param user ข้อมูลผู้ใช้
 */
export const deleteUserState = async (user: User): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[UserStateService] No user UID provided');
      return;
    }

    const stateDocRef = doc(db, 'userStates', user.uid);
    await deleteDoc(stateDocRef);
    
    console.log('[UserStateService] User state deleted successfully');
    
  } catch (error) {
    console.error('[UserStateService] Error deleting user state:', error);
    throw error;
  }
};

/**
 * อัพเดทเวลาการใช้งานล่าสุด
 * @param user ข้อมูลผู้ใช้
 */
export const updateLastActive = async (user: User): Promise<void> => {
  try {
    await updateUserState(user, 'lastActiveTime', new Date());
    
  } catch (error) {
    console.error('[UserStateService] Error updating last active:', error);
  }
};

/**
 * บันทึกการเริ่มต้น session
 * @param user ข้อมูลผู้ใช้
 */
export const startUserSession = async (user: User): Promise<void> => {
  try {
    const deviceInfo = typeof window !== 'undefined' ? navigator.userAgent : 'Unknown';
    
    await setUserState(user, {
      sessionStartTime: new Date(),
      lastActiveTime: new Date(),
      deviceInfo,
    });
    
  } catch (error) {
    console.error('[UserStateService] Error starting user session:', error);
  }
};

/**
 * ล้าง state ที่หมดอายุทั้งหมด (สำหรับ cleanup job)
 */
export const cleanupExpiredStates = async (): Promise<number> => {
  try {
    // ฟังก์ชันนี้ควรถูกเรียกจาก server-side job
    console.warn('[UserStateService] cleanupExpiredStates should be called from server-side');
    return 0;
    
  } catch (error) {
    console.error('[UserStateService] Error cleaning up expired states:', error);
    return 0;
  }
};