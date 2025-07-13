'use client';

import { User } from '@/app/features/auth/types/user';
import { updateUserState, startUserSession } from '../services/userStateService';

/**
 * Enhanced Session Utils - ปรับปรุงการจัดการ session โดยไม่ใช้ localStorage/sessionStorage
 */

/**
 * เริ่มต้น session ใหม่โดยไม่ใช้ browser storage
 * @param user ข้อมูลผู้ใช้
 */
export const initializeUserSession = async (user: User): Promise<void> => {
  try {
    if (!user?.uid) {
      console.warn('[EnhancedSessionUtils] No user provided for session initialization');
      return;
    }

    // บันทึกการเริ่มต้น session ใน Firebase
    await startUserSession(user);
    
    console.log('[EnhancedSessionUtils] User session initialized successfully');
    
  } catch (error) {
    console.error('[EnhancedSessionUtils] Error initializing session:', error);
  }
};

/**
 * อัพเดทการใช้งานล่าสุดโดยไม่ใช้ browser storage
 * @param user ข้อมูลผู้ใช้
 */
export const trackUserActivity = async (user: User): Promise<void> => {
  try {
    if (!user?.uid) return;

    // อัพเดทเวลาการใช้งานล่าสุดใน Firebase
    await updateUserState(user, 'lastActiveTime', new Date());
    
  } catch (error) {
    console.error('[EnhancedSessionUtils] Error tracking activity:', error);
  }
};

/**
 * บันทึกหน้าที่เข้าชมล่าสุด
 * @param user ข้อมูลผู้ใช้
 * @param page ชื่อหน้าที่เข้าชม
 */
export const trackPageVisit = async (user: User, page: string): Promise<void> => {
  try {
    if (!user?.uid || !page) return;

    await updateUserState(user, 'lastViewedPage', page);
    
  } catch (error) {
    console.error('[EnhancedSessionUtils] Error tracking page visit:', error);
  }
};

/**
 * ฟังก์ชันทำความสะอาด session (แทน sessionStorage.clear())
 * @param user ข้อมูลผู้ใช้
 */
export const cleanupUserSession = async (user: User): Promise<void> => {
  try {
    if (!user?.uid) return;

    // ลบข้อมูล session ที่ไม่จำเป็นออกจาก Firebase
    await updateUserState(user, 'sessionStartTime', undefined);
    await updateUserState(user, 'deviceInfo', undefined);
    
    console.log('[EnhancedSessionUtils] Session cleanup completed');
    
  } catch (error) {
    console.error('[EnhancedSessionUtils] Error cleaning up session:', error);
  }
};

/**
 * ตรวจสอบว่า user ยังคง active หรือไม่ (แทน sessionStorage check)
 * @param user ข้อมูลผู้ใช้
 * @returns true ถ้า session ยัง active
 */
export const isSessionActive = async (user: User): Promise<boolean> => {
  try {
    if (!user?.uid) return false;

    // ใช้ระบบ currentSessions ที่มีอยู่แล้วใน Firebase
    // หรือตรวจสอบจาก lastActiveTime ใน userState
    
    return true; // Placeholder - ใช้ระบบเดิมที่มีอยู่
    
  } catch (error) {
    console.error('[EnhancedSessionUtils] Error checking session:', error);
    return false;
  }
};

/**
 * สร้าง unique session identifier โดยไม่ใช้ browser storage
 * @param user ข้อมูลผู้ใช้
 * @returns session identifier
 */
export const generateSessionId = (user: User): string => {
  try {
    if (!user?.uid) return '';

    // สร้าง session ID จาก user data + timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${user.uid}_${timestamp}_${randomSuffix}`;
    
  } catch (error) {
    console.error('[EnhancedSessionUtils] Error generating session ID:', error);
    return '';
  }
};

/**
 * Hook สำหรับติดตาม activity อัตโนมัติ
 * @param user ข้อมูลผู้ใช้
 */
export const useActivityTracker = (user: User) => {
  if (typeof window === 'undefined') return;

  const handleActivity = () => {
    trackUserActivity(user);
  };

  // ติดตาม user activity events
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const setupActivityTracking = () => {
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
  };

  const cleanupActivityTracking = () => {
    events.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
  };

  return {
    setupActivityTracking,
    cleanupActivityTracking,
  };
};