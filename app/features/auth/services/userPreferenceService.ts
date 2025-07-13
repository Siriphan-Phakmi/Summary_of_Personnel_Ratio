'use client';

import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { User } from '@/app/features/auth/types/user';

/**
 * User Preferences Interface - ระบบจัดการการตั้งค่าผู้ใช้
 */
export interface UserPreferences {
  // Dashboard preferences
  dashboardShowWardDetails?: boolean;
  dashboardDefaultView?: 'summary' | 'detailed';
  
  // Form preferences  
  formAutoSave?: boolean;
  formDefaultShift?: 'morning' | 'night';
  
  // Notification preferences
  enableNotifications?: boolean;
  notificationSound?: boolean;
  
  // Theme preferences
  theme?: 'light' | 'dark' | 'auto';
  language?: 'th' | 'en';
  
  // Chart preferences
  chartDefaultType?: 'bar' | 'pie' | 'line';
  chartAnimations?: boolean;
  
  // Last updated
  updatedAt?: Date;
}

/**
 * Default preferences สำหรับผู้ใช้ใหม่
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  dashboardShowWardDetails: true,
  dashboardDefaultView: 'summary',
  formAutoSave: true,
  formDefaultShift: 'morning',
  enableNotifications: true,
  notificationSound: false,
  theme: 'light',
  language: 'th',
  chartDefaultType: 'bar',
  chartAnimations: true,
  updatedAt: new Date(),
};

/**
 * ดึงการตั้งค่าผู้ใช้จาก Firebase
 * @param user ข้อมูลผู้ใช้
 * @returns User preferences หรือ default preferences
 */
export const getUserPreferences = async (user: User): Promise<UserPreferences> => {
  try {
    if (!user?.uid) {
      console.warn('[UserPreferenceService] No user UID provided');
      return DEFAULT_PREFERENCES;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        ...DEFAULT_PREFERENCES,
        ...userData.preferences,
        updatedAt: userData.preferences?.updatedAt?.toDate() || new Date(),
      };
    }
    
    // ถ้าไม่มี document ให้สร้างใหม่ด้วย default preferences
    await setUserPreferences(user, DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
    
  } catch (error) {
    console.error('[UserPreferenceService] Error getting preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * บันทึกการตั้งค่าผู้ใช้ลง Firebase
 * @param user ข้อมูลผู้ใช้
 * @param preferences การตั้งค่าที่ต้องการบันทึก
 */
export const setUserPreferences = async (
  user: User, 
  preferences: Partial<UserPreferences>
): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[UserPreferenceService] No user UID provided');
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const updatedPreferences = {
      ...preferences,
      updatedAt: new Date(),
    };

    await updateDoc(userDocRef, {
      preferences: updatedPreferences,
    });

    console.log('[UserPreferenceService] Preferences updated successfully');
    
  } catch (error) {
    console.error('[UserPreferenceService] Error saving preferences:', error);
    throw error;
  }
};

/**
 * อัพเดทการตั้งค่าเฉพาะด้าน
 * @param user ข้อมูลผู้ใช้
 * @param key คีย์ของการตั้งค่า
 * @param value ค่าใหม่
 */
export const updateUserPreference = async <K extends keyof UserPreferences>(
  user: User,
  key: K,
  value: UserPreferences[K]
): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[UserPreferenceService] No user UID provided');
      return;
    }

    const currentPreferences = await getUserPreferences(user);
    const updatedPreferences = {
      ...currentPreferences,
      [key]: value,
      updatedAt: new Date(),
    };

    await setUserPreferences(user, updatedPreferences);
    
  } catch (error) {
    console.error('[UserPreferenceService] Error updating preference:', error);
    throw error;
  }
};

/**
 * รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น
 * @param user ข้อมูลผู้ใช้
 */
export const resetUserPreferences = async (user: User): Promise<void> => {
  try {
    await setUserPreferences(user, DEFAULT_PREFERENCES);
    console.log('[UserPreferenceService] Preferences reset to defaults');
    
  } catch (error) {
    console.error('[UserPreferenceService] Error resetting preferences:', error);
    throw error;
  }
};

/**
 * ตรวจสอบว่าผู้ใช้มีการตั้งค่าหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @returns true ถ้ามีการตั้งค่า
 */
export const hasUserPreferences = async (user: User): Promise<boolean> => {
  try {
    if (!user?.uid) return false;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    return userDoc.exists() && !!userDoc.data()?.preferences;
    
  } catch (error) {
    console.error('[UserPreferenceService] Error checking preferences:', error);
    return false;
  }
};