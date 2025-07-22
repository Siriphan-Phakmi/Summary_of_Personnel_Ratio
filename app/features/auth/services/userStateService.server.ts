import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { User } from '@/app/features/auth/types/user';

/**
 * Server-side User State Service
 * สำหรับใช้งานฝั่ง server (API routes) เท่านั้น
 */

export interface UserState {
  // Session state
  sessionStartTime?: Date;
  lastActiveTime?: Date;
  deviceInfo?: string;
  
  // Notification state
  lastNotificationDate?: string;
  dismissedNotifications?: string[];
  currentSession?: {
    hasCheckedPreviousData: boolean;
    checkedWards: string[];
    checkedDates: string[];
    sessionId: string;
    lastDataCheckTime: number;
  };
  
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
 * Server-side: ดึง state ของผู้ใช้จาก Firebase
 */
export const getUserStateServer = async (user: User): Promise<UserState | null> => {
  try {
    if (!user?.uid) {
      console.warn('[UserStateService.Server] No user UID provided');
      return null;
    }

    const stateDocRef = doc(db, 'userStates', user.uid);
    const stateDoc = await getDoc(stateDocRef);
    
    if (stateDoc.exists()) {
      const data = stateDoc.data();
      
      // ตรวจสอบว่า state หมดอายุหรือไม่
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        await deleteUserStateServer(user);
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
    console.error('[UserStateService.Server] Error getting user state:', error);
    return null;
  }
};

/**
 * Server-side: บันทึก state ของผู้ใช้ลง Firebase
 */
export const setUserStateServer = async (
  user: User, 
  state: Partial<UserState>
): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[UserStateService.Server] No user UID provided');
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
    const existingState = await getUserStateServer(user);
    if (!existingState) {
      stateToSave.createdAt = serverTimestamp();
    }

    await setDoc(stateDocRef, stateToSave, { merge: true });
    
  } catch (error) {
    console.error('[UserStateService.Server] Error saving user state:', error);
    throw error;
  }
};

/**
 * Server-side: อัพเดท state เฉพาะด้าน
 */
export const updateUserStateServer = async <K extends keyof UserState>(
  user: User,
  key: K,
  value: UserState[K]
): Promise<void> => {
  try {
    const stateUpdate = { [key]: value } as Partial<UserState>;
    await setUserStateServer(user, stateUpdate);
    
  } catch (error) {
    console.error('[UserStateService.Server] Error updating user state:', error);
    throw error;
  }
};

/**
 * Server-side: ลบ state ของผู้ใช้
 */
export const deleteUserStateServer = async (user: User): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[UserStateService.Server] No user UID provided');
      return;
    }

    const stateDocRef = doc(db, 'userStates', user.uid);
    await deleteDoc(stateDocRef);
    
    console.log('[UserStateService.Server] User state deleted successfully');
    
  } catch (error) {
    console.error('[UserStateService.Server] Error deleting user state:', error);
    throw error;
  }
};

/**
 * Server-side: บันทึกการเริ่มต้น session
 */
export const startUserSessionServer = async (user: User): Promise<void> => {
  try {
    await setUserStateServer(user, {
      sessionStartTime: new Date(),
      lastActiveTime: new Date(),
      deviceInfo: 'Server',
    });
    
  } catch (error) {
    console.error('[UserStateService.Server] Error starting user session:', error);
  }
};
