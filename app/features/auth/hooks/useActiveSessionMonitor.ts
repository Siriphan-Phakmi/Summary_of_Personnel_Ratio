'use client';

import { useEffect, useRef, useCallback } from 'react';
import { User } from '@/app/features/auth/types/user';
import { FirestoreSessionManager } from '@/app/features/auth/services/firestoreSessionManager';
import { Logger } from '@/app/lib/utils/logger';

interface UseActiveSessionMonitorProps {
  user: User | null;
  onForceLogout: () => void;
}

/**
 * 🎧 Hook สำหรับติดตาม Session Changes และ Force Logout Detection
 * ใช้กับ Single Active Session System
 */
export const useActiveSessionMonitor = ({ 
  user, 
  onForceLogout 
}: UseActiveSessionMonitorProps) => {
  const sessionManagerRef = useRef<FirestoreSessionManager>();
  const isMonitoringRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // ✅ Stable callback reference
  const stableForceLogoutCallback = useCallback(() => {
    if (typeof onForceLogout === 'function') {
      try {
        onForceLogout();
      } catch (callbackError) {
        Logger.error('[useActiveSessionMonitor] Force logout callback failed:', callbackError);
      }
    }
  }, [onForceLogout]);

  // ✅ Activity is handled automatically by FirestoreSessionManager
  // No manual updateActivity needed

  // ✅ Single useEffect - รวมทุกอย่างไว้
  useEffect(() => {
    if (!user?.uid) {
      // Cleanup if no user
      if (isMonitoringRef.current && userIdRef.current) {
        sessionManagerRef.current?.stopSessionMonitoring();
        isMonitoringRef.current = false;
        userIdRef.current = null;
      }
      return;
    }

    // ✅ ถ้า user เดียวกัน ไม่ต้อง setup ใหม่
    if (userIdRef.current === user.uid && isMonitoringRef.current) {
      return;
    }

    // ✅ Defensive: ตรวจสอบ environment
    if (typeof window === 'undefined') {
      Logger.warn('[useActiveSessionMonitor] Not running in browser environment');
      return;
    }

    try {
      // Cleanup previous monitoring if exists
      if (isMonitoringRef.current && userIdRef.current) {
        sessionManagerRef.current?.stopSessionMonitoring();
        isMonitoringRef.current = false;
      }

      // Initialize session manager
      sessionManagerRef.current = FirestoreSessionManager.getInstance();
      userIdRef.current = user.uid;
      isMonitoringRef.current = true;
      
      // Start session monitoring
      sessionManagerRef.current.startSessionMonitoring(
        user.uid,
        () => {
          Logger.warn(`[useActiveSessionMonitor] Force logout detected for user ${user.username}`);
          stableForceLogoutCallback();
        }
      );

      Logger.info(`[useActiveSessionMonitor] Started monitoring for user ${user.username}`);

      // Cleanup function
      return () => {
        if (sessionManagerRef.current && isMonitoringRef.current && userIdRef.current) {
          sessionManagerRef.current.stopSessionMonitoring();
          isMonitoringRef.current = false;
          Logger.info(`[useActiveSessionMonitor] Stopped monitoring for user ${user.username}`);
        }
      };

    } catch (error) {
      Logger.error('[useActiveSessionMonitor] Failed to start session monitoring:', error);
      isMonitoringRef.current = false;
      userIdRef.current = null;
    }
  }, [user?.uid, user?.username, stableForceLogoutCallback]); // ✅ Stable dependencies only

  return {
    isMonitoring: isMonitoringRef.current,
  };
};