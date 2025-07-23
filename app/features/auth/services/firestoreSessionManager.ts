import { doc, setDoc, deleteDoc, getDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { User } from '@/app/features/auth/types/user';
import { Logger } from '@/app/lib/utils/logger';

/**
 * 🔒 Firestore Session Manager - Single Active Session Control
 * หลักการ: Force Logout เซสชันเก่าเมื่อมี Login ใหม่
 * ใช้ Firestore แทน Realtime Database เพื่อใช้ประโยชน์จาก security rules ที่มีอยู่
 */

interface FirestoreSession {
  sessionId: string;
  userId: string;
  username: string;
  loginTime: Timestamp;
  lastActivity: Timestamp;
  userAgent: string;
  ipAddress: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirestoreSessionManager {
  private static instance: FirestoreSessionManager;
  private currentSessionId: string | null = null;
  private sessionUnsubscribe: (() => void) | null = null;
  private lastActivityUpdate: number = 0;
  private activityUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): FirestoreSessionManager {
    if (!FirestoreSessionManager.instance) {
      FirestoreSessionManager.instance = new FirestoreSessionManager();
    }
    return FirestoreSessionManager.instance;
  }

  /**
   * 🔐 สร้าง Session ใหม่และ Force Logout Session เก่า
   */
  public async createNewSession(
    user: User,
    clientInfo: { userAgent: string; ipAddress: string }
  ): Promise<string> {
    try {
      // ✅ Defensive: ตรวจสอบ Firestore connection
      if (!db) {
        Logger.warn('[FirestoreSessionManager] Firestore not available');
        return `fallback_session_${Date.now()}`;
      }

      const sessionId = `session_${user.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Timestamp.now();

      // 1. ลบ session เก่า (หลาย session จะถูกจัดการใน Firestore rules)
      await this.cleanupOldSession(user.uid);

      // 2. สร้าง session ใหม่
      const newSession: FirestoreSession = {
        sessionId,
        userId: user.uid,
        username: user.username,
        loginTime: now,
        lastActivity: now,
        userAgent: clientInfo.userAgent || 'unknown',
        ipAddress: clientInfo.ipAddress || '127.0.0.1',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      // 3. บันทึกลง Firestore (ไม่มี timeout เพราะ Firestore มี built-in retry)
      const sessionDocRef = doc(db, 'currentSessions', user.uid);
      await setDoc(sessionDocRef, newSession);

      this.currentSessionId = sessionId;
      
      // เริ่ม activity update interval
      this.startActivityUpdater(user.uid);
      
      Logger.info(`[FirestoreSessionManager] Created new session ${sessionId} for user ${user.username}`);

      return sessionId;
    } catch (error) {
      Logger.error('[FirestoreSessionManager] Failed to create new session:', error);
      
      // ✅ Fallback: Return generated session ID
      const fallbackSessionId = `fallback_session_${Date.now()}`;
      this.currentSessionId = fallbackSessionId;
      
      Logger.warn(`[FirestoreSessionManager] Using fallback session: ${fallbackSessionId}`);
      return fallbackSessionId;
    }
  }

  /**
   * 🚫 Clean up old session
   */
  private async cleanupOldSession(userId: string): Promise<void> {
    try {
      const sessionDocRef = doc(db, 'currentSessions', userId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (sessionDoc.exists()) {
        Logger.info(`[FirestoreSessionManager] Cleaning up old session for user ${userId}`);
        await deleteDoc(sessionDocRef);
      }
    } catch (error) {
      Logger.warn('[FirestoreSessionManager] Failed to cleanup old session:', error);
      // ไม่ throw error เพราะไม่อยากให้ login fail
    }
  }

  /**
   * 🎧 ติดตาม Session Changes เพื่อ Detect Force Logout
   */
  public startSessionMonitoring(userId: string, onForceLogout: () => void): void {
    try {
      if (!db) {
        Logger.warn('[FirestoreSessionManager] Firestore not available for monitoring');
        return;
      }

      const sessionDocRef = doc(db, 'currentSessions', userId);
      
      this.sessionUnsubscribe = onSnapshot(sessionDocRef, (docSnapshot) => {
        if (!docSnapshot.exists()) {
          Logger.warn(`[FirestoreSessionManager] Session removed for user ${userId} - Force logout detected`);
          onForceLogout();
          return;
        }

        const sessionData = docSnapshot.data() as FirestoreSession;
        
        if (!sessionData.isActive) {
          Logger.warn(`[FirestoreSessionManager] Session deactivated for user ${userId}`);
          onForceLogout();
          return;
        }

        // ตรวจสอบว่าเป็น session ปัจจุบันหรือไม่
        if (this.currentSessionId && sessionData.sessionId !== this.currentSessionId) {
          Logger.warn(`[FirestoreSessionManager] Session conflict detected - Current: ${this.currentSessionId}, Active: ${sessionData.sessionId}`);
          onForceLogout();
          return;
        }
      }, (error) => {
        Logger.error('[FirestoreSessionManager] Session monitoring error:', error);
      });

      Logger.info(`[FirestoreSessionManager] Started session monitoring for user ${userId}`);
    } catch (error) {
      Logger.error('[FirestoreSessionManager] Failed to start session monitoring:', error);
    }
  }

  /**
   * 🔄 เริ่ม Activity Updater (ใช้ interval แทน manual update)
   */
  private startActivityUpdater(userId: string): void {
    // Clear existing interval
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
    }

    // Update activity every 30 seconds
    this.activityUpdateInterval = setInterval(async () => {
      try {
        if (!this.currentSessionId || !db) return;

        const sessionDocRef = doc(db, 'currentSessions', userId);
        await setDoc(sessionDocRef, {
          lastActivity: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }, { merge: true });

      } catch (error) {
        Logger.warn('[FirestoreSessionManager] Failed to update activity:', error);
      }
    }, 30000); // 30 seconds interval
  }

  /**
   * ✅ ตรวจสอบว่า Session ยังใช้งานได้หรือไม่
   */
  public async isSessionValid(userId: string, sessionId: string): Promise<boolean> {
    try {
      if (!db) return false;

      const sessionDocRef = doc(db, 'currentSessions', userId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (!sessionDoc.exists()) {
        return false;
      }

      const sessionData = sessionDoc.data() as FirestoreSession;
      return sessionData.isActive && sessionData.sessionId === sessionId;
    } catch (error) {
      Logger.error('[FirestoreSessionManager] Failed to validate session:', error);
      return false;
    }
  }

  /**
   * 🚪 ลบ Session ปัจจุบัน (Logout)
   */
  public async removeCurrentSession(userId: string): Promise<void> {
    try {
      // หยุด session monitoring
      if (this.sessionUnsubscribe) {
        this.sessionUnsubscribe();
        this.sessionUnsubscribe = null;
      }

      // หยุด activity updater
      if (this.activityUpdateInterval) {
        clearInterval(this.activityUpdateInterval);
        this.activityUpdateInterval = null;
      }

      // ลบ session จาก Firestore
      if (db) {
        const sessionDocRef = doc(db, 'currentSessions', userId);
        await deleteDoc(sessionDocRef);
      }

      this.currentSessionId = null;
      
      Logger.info(`[FirestoreSessionManager] Removed current session for user ${userId}`);
    } catch (error) {
      Logger.error('[FirestoreSessionManager] Failed to remove current session:', error);
      throw error;
    }
  }

  /**
   * 🛑 หยุด Session Monitoring
   */
  public stopSessionMonitoring(): void {
    try {
      if (this.sessionUnsubscribe) {
        this.sessionUnsubscribe();
        this.sessionUnsubscribe = null;
        Logger.info('[FirestoreSessionManager] Stopped session monitoring');
      }

      if (this.activityUpdateInterval) {
        clearInterval(this.activityUpdateInterval);
        this.activityUpdateInterval = null;
      }
    } catch (error) {
      Logger.error('[FirestoreSessionManager] Failed to stop session monitoring:', error);
    }
  }

  /**
   * 📊 ดึงข้อมูล Session ปัจจุบัน
   */
  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 🧹 ทำความสะอาด Resources (เรียกเมื่อ component unmount)
   */
  public cleanup(): void {
    this.stopSessionMonitoring();
    this.currentSessionId = null;
  }
}

export default FirestoreSessionManager;