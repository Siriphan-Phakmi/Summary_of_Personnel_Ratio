'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types/user';
import { logLogin, logLogout } from '../services/logService';
import { showErrorToast } from '@/app/lib/utils/toastUtils';
import { useActiveSessionMonitor } from './useActiveSessionMonitor';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Constants for timers
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

function devLog(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AUTH_CORE ${timestamp}] ${message}`);
  }
}

export const useAuthCore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingSessionRef = useRef<boolean>(false); // ✅ Prevent multiple session checks

  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (activityCheckIntervalRef.current) clearInterval(activityCheckIntervalRef.current);
    devLog('All timers cleared.');
  }, []);

  const clearStorageData = useCallback(() => {
    // ✅ เหลือเฉพาะการลบ cookies (ไม่ใช้ browser storage)
    if (typeof document !== 'undefined') {
      document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
    devLog('All cookie data cleared including session_id.');
  }, []);
  
  const saveUserData = useCallback((userData: User) => {
    // ✅ Cookies are set by the server via API response (httpOnly)
    // ลบ localStorage และ sessionStorage backup ออกทั้งหมด
    // ใช้เฉพาะ server-side cookies และ Firebase session management
    devLog(`User data saved: ${userData.username} (${userData.role})`);
  }, []);

  const logoutUser = useCallback(async (currentUser?: User | null) => {
    if (isLoggingOut) return;
    devLog('Starting logout process...');
    setIsLoggingOut(true);
    
    try {
      const userToLogOut = currentUser || user;
      if (userToLogOut) {
        await fetch('/api/auth/logout', { method: 'POST' });
        devLog(`Logged out user: ${userToLogOut.username}`);
      }
    } catch (err) {
      devLog(`Error during server logout: ${String(err)}`);
    } finally {
      clearTimers();
      clearStorageData();
      setUser(null);
      setAuthStatus('unauthenticated');
      setIsLoggingOut(false);
      devLog('Client-side logout complete. Forcing a full page reload to /login.');
      window.location.href = '/login';
    }
  }, [isLoggingOut, user, clearTimers, clearStorageData]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      devLog('Inactivity timeout reached. Logging out...');
      logoutUser(user);
    }, SESSION_TIMEOUT);
  }, [logoutUser, user]);

  const handleUserActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const setupActivityCheck = useCallback(() => {
    resetInactivityTimer();
    if (activityCheckIntervalRef.current) clearInterval(activityCheckIntervalRef.current);
    activityCheckIntervalRef.current = setInterval(async () => {
      if (user?.uid) {
        try {
          devLog('Sending periodic activity update.');
          await fetch('/api/auth/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          });
        } catch (err) {
          devLog(`Error sending activity update: ${String(err)}`);
        }
      }
    }, ACTIVITY_UPDATE_INTERVAL);
  }, [user, resetInactivityTimer]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    devLog(`Attempting login for: ${username}`);
    setAuthStatus('loading');
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      // ตรวจสอบว่าเป็น JSON response หรือไม่
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('เซิร์ฟเวอร์ไม่ตอบสนองในรูปแบบที่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
      
      const result = await response.json();

      if (response.ok && result.success && result.user) {
        devLog(`Login successful for user: ${result.user.username}`);
        setUser(result.user);
        setAuthStatus('authenticated');
        saveUserData(result.user);
        
        return true;
      } else {
        const errorMessage = result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        setError(errorMessage);
        setAuthStatus('unauthenticated');
        showErrorToast(errorMessage);
        return false;
      }
    } catch (err) {
      let errorMessage = 'เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการล็อกอิน';
      
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ';
      } else if (err instanceof SyntaxError && err.message.includes('Unexpected token')) {
        errorMessage = 'ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      devLog(`Login error: ${String(err)}`);
      setError(errorMessage);
      setAuthStatus('unauthenticated');
      showErrorToast(errorMessage);
      return false;
    }
  }, [saveUserData]);

  const checkSession = useCallback(async () => {
    if (isLoggingOut) {
        devLog('Skipping session check during logout.');
        return;
    }
    
    // ✅ Guard against multiple concurrent session checks
    if (isCheckingSessionRef.current) {
      devLog('Session check already in progress, skipping...');
      return;
    }
    
    isCheckingSessionRef.current = true;
    devLog('Checking session...');
    setAuthStatus('loading');
    
    try {
      const response = await fetch('/api/auth/session', { method: 'GET' });
      const result = await response.json();
      if (response.ok && result.authenticated && result.user) {
        devLog(`Session valid for user: ${result.user.username}`);
        setUser(result.user);
        setAuthStatus('authenticated');
      } else {
        devLog('No valid session found.');
        setUser(null);
        setAuthStatus('unauthenticated');
        clearTimers();
      }
    } catch (err) {
      devLog(`Session check error: ${String(err)}`);
      setError('เกิดข้อผิดพลาดในการตรวจสอบเซสชัน');
      setAuthStatus('unauthenticated');
      clearTimers();
    } finally {
      isCheckingSessionRef.current = false; // ✅ Release lock
    }
  }, [clearTimers, isLoggingOut]);
  
  const checkRole = useCallback((requiredRole?: string | string[]) => {
    if (!user || authStatus !== 'authenticated') return false;
    if (!requiredRole) return true;
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // Handle all possible types of user.role to prevent TypeScript errors
    let userRoleString: string;
    
    if (typeof user.role === 'string') {
      userRoleString = user.role;
    } else if (user.role && typeof user.role === 'object') {
      // Handle enum case
      userRoleString = String(user.role);
    } else {
      // Fallback for any other case
      userRoleString = String(user.role);
    }
    
    return roles.includes(userRoleString);
  }, [user, authStatus]);

  // ✅ Stable force logout callback - move outside useActiveSessionMonitor
  const stableForceLogoutCallback = useCallback(() => {
    devLog('🚫 Force logout triggered by session monitor');
    showErrorToast('คุณถูก logout อัตโนมัติเนื่องจากมีการล็อกอินจากที่อื่น');
    logoutUser();
  }, [logoutUser]);

  // 🔒 Active Session Monitor Integration
  useActiveSessionMonitor({
    user,
    onForceLogout: stableForceLogoutCallback
  });

  useEffect(() => {
    // Run session check only once on initial mount
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      const activityEvents: ('mousemove' | 'keydown' | 'click' | 'scroll')[] = ['mousemove', 'keydown', 'click', 'scroll'];
      devLog('Setting up activity listeners and periodic check.');
      setupActivityCheck();
      activityEvents.forEach(event => window.addEventListener(event, handleUserActivity));
      
      return () => {
        devLog('Cleaning up activity listeners and periodic check.');
        activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
        clearTimers();
      };
    }
  }, [authStatus, handleUserActivity, clearTimers, setupActivityCheck]);
  
  return {
    user,
    authStatus,
    error,
    isLoggingOut,
    login,
    logout: () => logoutUser(user),
    checkSession,
    checkRole
  };
}; 