'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, rtdb } from '@/app/core/firebase/firebase';
import { ref, get } from 'firebase/database';
import { User } from '@/app/core/types/user';
import toast from 'react-hot-toast';
import { isTokenValid } from '@/app/core/utils/authUtils';

// Import services
import {
  loginWithCredentials,
  checkSavedSession,
  getCachedUser,
} from './services/loginService';
import { logoutUser } from './services/logoutService';
import { checkUserRole } from './services/roleService';
import { 
  watchCurrentSession, 
  updateSessionActivity, 
  createUserSession,
  resetUserSessions
} from './services/sessionService';

// Define authentication context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
  checkRole: (requiredRole?: string | string[]) => boolean;
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Activity update interval (5 minutes)
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000;

// Simple throttle implementation with basic types
const throttle = (func: (...args: any[]) => void, limit: number): (...args: any[]) => void => {
  let inThrottle: boolean = false;
  let lastArgs: any[] | null = null;
  let lastContext: any = null;
  let timer: NodeJS.Timeout | null = null;

  const throttled = function(this: any, ...args: any[]) {
    lastArgs = args;
    lastContext = this;

    if (!inThrottle) {
      func.apply(lastContext, lastArgs);
      inThrottle = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }
  return throttled;
}

/**
 * แสดง log
 * @param message ข้อความที่ต้องการแสดง
 */
function devLog(message: string): void {
  console.log(`[AUTH] ${message}`);
}

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  // ตอนเริ่มต้น ลองดึงข้อมูล cached user มาใช้ก่อน
  const initialCachedUser = getCachedUser();
  const [user, setUser] = useState<User | null>(initialCachedUser);
  const [isLoading, setIsLoading] = useState(initialCachedUser ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUnsubscribe, setSessionUnsubscribe] = useState<(() => void) | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Logout function must be defined *before* useEffect that uses it
  const logout = useCallback(async () => {
    try {
      // บันทึก log การ logout ก่อน (เพราะต้องใช้ข้อมูล user ที่กำลังจะถูกลบ)
      if (user) {
        try {
          const { logLogout } = await import('./services/logService');
          await logLogout(user);
          devLog(`Logout user: ${user.username || user.uid}`);
        } catch (logError) {
          console.error('Error logging logout:', logError);
        }
      }
      
      // ยกเลิก session watcher ถ้ามี
      if (sessionUnsubscribe) {
        sessionUnsubscribe();
        setSessionUnsubscribe(null);
      }
      
      // ทำการ logout
      logoutUser(user, () => {
        // ล้างข้อมูล user state
        setUser(null);
        setSessionId(null);
        
        // ล้าง session storage เพิ่มเติม
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('currentSessionId');
          localStorage.removeItem('lastLoginUser');
          // ล้าง cache อื่นๆ ที่เกี่ยวข้อง
          const keysToRemove = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.startsWith('auth_') || key.startsWith('user_') || key.startsWith('session_'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
          
          // ล้าง local storage เกี่ยวกับ auth
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('auth_') || key.startsWith('user_') || key.startsWith('session_'))) {
              localStorage.removeItem(key);
            }
          }
          
          devLog('Cleared session storage and auth-related local storage items');
        }
        
        router.push('/login');
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [user, router, sessionUnsubscribe]);

  // ฟังก์ชันสำหรับตรวจสอบเมื่อมีการล็อกอินซ้ำซ้อน
  const handleSessionChange = useCallback((isValid: boolean) => {
    if (!isValid && user) {
      // ถ้า session ไม่ถูกต้อง แสดงว่ามีการล็อกอินจากที่อื่น
      devLog('Session invalidated, logging out');
      toast.error('คุณถูกออกจากระบบเนื่องจากมีการเข้าสู่ระบบจากอุปกรณ์อื่น');
      logout();
      router.push('/login?reason=duplicate_login');
    }
  }, [user, logout, router]);

  // ฟังก์ชันตรวจสอบสิทธิ์ผู้ใช้
  const checkRole = useCallback((requiredRole?: string | string[]) => {
    return checkUserRole(user, requiredRole);
  }, [user]);

  // Reset inactivity timer when user interacts with the app
  const resetInactivityTimer = useCallback(() => { 
    setLastActivity(Date.now());
  }, []); // Wrap with useCallback

  // Throttle the reset function (e.g., run at most once every 500ms)
  const throttledReset = useMemo(() => throttle(resetInactivityTimer, 500), [resetInactivityTimer]);

  // ตรวจสอบความถูกต้องของ token ทุก 5 นาที
  useEffect(() => {
    const checkTokenValidity = async () => {
      // ถ้าไม่มี user หรือเป็นการรันที่ server ให้ข้าม
      if (typeof window === 'undefined' || !user) return;
      
      try {
        // ตรวจสอบว่า token ยังใช้งานได้หรือไม่
        const isValid = await isTokenValid();
        if (!isValid) {
          console.log('Token is invalid or expired');
          // ยกเว้นการทำงานนี้ชั่วคราวเพื่อแก้ไขปัญหา Realtime Database
          console.warn('Skipping session validation temporarily due to Realtime Database connection issues');
          // logout();
          // router.push('/login?reason=session_expired');
        }
      } catch (error) {
        console.warn('Token validation failed but allowing session to continue:', error);
        // ไม่ทำการ logout ในกรณีเกิดข้อผิดพลาดเพื่อให้สามารถใช้งานได้
      }
    };
    
    // ตรวจสอบทุก 5 นาที
    const tokenCheckInterval = setInterval(() => {
      checkTokenValidity();
    }, 5 * 60 * 1000);
    
    // ตรวจสอบเมื่อเริ่มต้น
    checkTokenValidity();
    
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [user, logout, router]);

  // อัพเดทเวลาล่าสุดที่ใช้งานทุก 5 นาที
  useEffect(() => {
    // ถ้าไม่มี user หรือไม่มี sessionId ให้ข้าม
    if (!user || !user.uid || !sessionId) return;

    const updateActivity = async () => {
      try {
        await updateSessionActivity(user.uid, sessionId);
        devLog(`Updated session activity for session ${sessionId}`);
      } catch (error) {
        console.error('Failed to update session activity:', error);
      }
    };

    // อัพเดทเวลาที่ใช้งานล่าสุดทุก 5 นาที
    const activityInterval = setInterval(updateActivity, ACTIVITY_UPDATE_INTERVAL);

    // อัพเดทเมื่อเริ่มต้น
    updateActivity();

    return () => {
      clearInterval(activityInterval);
    };
  }, [user, sessionId]);

  // เริ่ม session watcher เมื่อ user และ sessionId มีการเปลี่ยนแปลง
  useEffect(() => {
    // ยกเลิก watcher เดิมถ้ามี
    if (sessionUnsubscribe) {
      sessionUnsubscribe();
      setSessionUnsubscribe(null);
    }
    
    if (user?.uid && sessionId) {
      devLog(`Starting session watcher for user ${user.uid} session ${sessionId}`);
      const unsubscribeFunc = watchCurrentSession(
        user.uid,
        sessionId,
        handleSessionChange
      );
      setSessionUnsubscribe(() => unsubscribeFunc);
    }
    
    return () => {
      if (sessionUnsubscribe) {
        sessionUnsubscribe();
      }
    };
  }, [user, sessionId, handleSessionChange]);

  useEffect(() => {
    // ถ้ามี initialCachedUser แล้ว ให้ข้ามการเซ็ต isLoading = true
    // เพื่อป้องกันการกระพริบของหน้าจอ
    if (!initialCachedUser) {
      setIsLoading(true);
    }
    
    // ตรวจสอบ session ที่บันทึกไว้
    const checkSession = async () => {
      try {
        const userData = await checkSavedSession(user);
        if (userData) {
          setUser(userData);
          
          // ตรวจสอบ sessionId ที่บันทึกไว้ใน sessionStorage
          const savedSessionId = sessionStorage.getItem('currentSessionId');
          if (savedSessionId && userData.uid) {
            // ตรวจสอบว่า session ยังใช้งานได้หรือไม่
            watchCurrentSession(userData.uid, savedSessionId, handleSessionChange);
            setSessionId(savedSessionId);
          } else if (userData.uid) {
            // ถ้าไม่มี session ที่บันทึกไว้ สร้าง session ใหม่
            const newSessionId = await createUserSession(userData);
            if (newSessionId) {
              sessionStorage.setItem('currentSessionId', newSessionId);
              setSessionId(newSessionId);
            }
          }
        }
      } catch (err) {
        console.error('Error checking saved session:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // On component mount, check if there's a saved session
    checkSession();

    // Add event listeners for activity tracking
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, throttledReset);
    });

    // Set up inactivity timer
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT && user) {
        console.log('Session timed out due to inactivity');
        logout();
        router.push('/login?reason=session_expired');
      }
    }, 60000); // Check every minute

    // Clean up function
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
      });
      clearInterval(intervalId);
    };
  }, [logout, lastActivity, router, throttledReset, user, initialCachedUser, handleSessionChange]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("AuthContext: Starting login process...");
      
      if (!username || !password) {
        console.error("Missing username or password");
        setError('Please enter username and password');
        return false;
      }
      
      // แสดง username ที่พยายามล็อกอิน (ไม่แสดง password เพื่อความปลอดภัย)
      console.log(`AuthContext: Login attempt for username: ${username}`);
      
      // ใช้ loginWithCredentials โดยส่ง callback ในการตั้งค่า user state
      const result = await loginWithCredentials(
        username, 
        password, 
        // ส่ง callback ในการตั้งค่า user เพื่อลดการโหลดข้อมูลซ้ำ
        (loggedInUser) => {
          console.log("AuthContext: Setting user directly from callback", 
            loggedInUser ? `(${loggedInUser.username}, ${loggedInUser.role})` : 'null');
          setUser(loggedInUser);
        }
      );
      
      if (result.success && result.user) {
        console.log(`AuthContext: Login successful for user: ${result.user.username}, role: ${result.user.role}`);
        
        // ตั้งค่า session ID ใน session storage
        if (result.sessionId) {
          sessionStorage.setItem('currentSessionId', result.sessionId);
          console.log(`AuthContext: Session ID saved to session storage: ${result.sessionId.substring(0, 5)}...`);
        } else {
          console.warn("AuthContext: No session ID returned after successful login");
        }
        
        // Reset inactivity timer
        resetInactivityTimer();
        
        return true;
      } else {
        // กรณีล็อกอินไม่สำเร็จ
        console.error(`AuthContext: Login failed: ${result.error || 'Unknown error'}`);
        setError(result.error || 'Failed to login. Please check your credentials.');
        return false;
      }
    } catch (err) {
      console.error("AuthContext: Error during login:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันเริ่มการติดตามกิจกรรมของผู้ใช้
  const startActivityTracking = useCallback(() => {
    devLog('Starting activity tracking');
    // ตั้งค่าเริ่มต้นสำหรับเวลาใช้งานล่าสุด
    setLastActivity(Date.now());
    
    // แสดงให้เห็นว่าได้เริ่มการติดตามแล้ว
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Export the auth context provider and hook
  const contextValue = {
    user,
    isLoading,
    login,
    logout,
    error,
    checkRole
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 