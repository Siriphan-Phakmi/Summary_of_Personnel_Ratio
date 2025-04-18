'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, rtdb } from '@/app/core/firebase/firebase';
import { ref, get } from 'firebase/database';
import { User } from '@/app/core/types/user';
import toast from 'react-hot-toast';
import { isTokenValid } from '@/app/core/utils/authUtils';
import { dismissAllToasts } from '@/app/core/utils/toastUtils';

// Import services
import {
  loginWithCredentials,
  checkSavedSession,
  getCachedUser,
} from './services/loginService';
import { logoutService } from './services/logoutService';
import { checkUserRole } from './services/roleService';
import { 
  watchCurrentSession, 
  updateSessionActivity, 
  createUserSession,
  resetUserSessions,
  endUserSession
} from './services/sessionService';

// Define authentication context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUnsubscribe, setSessionUnsubscribe] = useState<(() => void) | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // ฟังก์ชันล้าง cookies และ storage ที่เกี่ยวข้องกับการตรวจสอบสิทธิ์
  const clearAuthCookies = useCallback(() => {
    if (typeof window !== 'undefined') {
      // ล้าง session storage
      sessionStorage.removeItem('currentSessionId');
      sessionStorage.removeItem('csrfToken');
      
      // ล้าง cookies ที่เกี่ยวข้อง
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      devLog('Cleared auth cookies and storage');
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setIsLoggingOut(true);
      setError(null);

      // ลบ toast notifications ทั้งหมดก่อนออกจากระบบ
      dismissAllToasts();

      if (user) {
        // Call the logout service with the current user
        await logoutService.logout(user);
        
        // Reset user state
        setUser(null);
        setLastActivity(0);
        
        // Clear session storage and cookies
        clearAuthCookies();
        
        console.log("User logged out successfully");
        
        // Redirect to login page
        router.push('/login');
      } else {
        // Even if there's no user, we should clear cookies and storage
        clearAuthCookies();
        console.log("No active user, but cleared auth data");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoggingOut(false);
    }
  }, [user, router, clearAuthCookies]);

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
    // เพิ่ม log เพื่อตรวจสอบ
    console.log('[AUTH Debug] checkRole called with:', { 
      user: user ? { 
        uid: user.uid, 
        role: user.role,
        username: user.username 
      } : null, 
      requiredRole 
    });
    return checkUserRole(user, requiredRole);
  }, [user]);

  // เพิ่ม effect เพื่อ log การเปลี่ยนแปลงของ user
  useEffect(() => {
    if (user) {
      console.log('[AUTH Debug] User state changed:', { 
        uid: user.uid, 
        role: user.role,
        username: user.username 
      });
    } else {
      console.log('[AUTH Debug] User is null or undefined');
    }
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
    // if (!initialCachedUser) {
    //  setIsLoading(true); // นำออกไปก่อน เพื่อให้ initial state จัดการ
    // }
    
    // เพิ่ม debugging log
    console.log('AuthContext initial state:', { 
      hasInitialCachedUser: !!initialCachedUser,
      initialUserRole: initialCachedUser?.role || 'none',
      // isLoading // Reflects state *before* checkSession runs
      isLoading: true // Assume loading until checkSession completes
    });
    
    // ตรวจสอบ session ที่บันทึกไว้
    const checkSession = async () => {
      // Ensure loading is true at the start of the check
      // Note: Initial state might already be true if !initialCachedUser
      setIsLoading(true); 
      try {
        const userData = await checkSavedSession(user); // Pass current user state
        if (userData) {
          console.log('Session check successful, user data:', { 
            username: userData.username,
            role: userData.role, 
            uid: userData.uid
          });
          
          setUser(userData);
          
          // ตรวจสอบ sessionId ที่บันทึกไว้ใน sessionStorage
          const savedSessionId = sessionStorage.getItem('currentSessionId');
          if (savedSessionId && userData.uid) {
            // ตรวจสอบว่า session ยังใช้งานได้หรือไม่
            // แก้ไข: ย้าย session watcher ไปเริ่มหลังจาก setSessionId
            // watchCurrentSession(userData.uid, savedSessionId, handleSessionChange);
            setSessionId(savedSessionId);
          } else if (userData.uid) {
            // ถ้าไม่มี session ที่บันทึกไว้ สร้าง session ใหม่
            try {
              const newSessionId = await createUserSession(userData.uid, userData.role);
              if (newSessionId) {
                sessionStorage.setItem('currentSessionId', newSessionId);
                setSessionId(newSessionId);
              }
            } catch (sessionErr) {
              console.error('Error creating new session, but continuing login:', sessionErr);
              // ไม่ throw error เพื่อให้ยังสามารถเข้าสู่ระบบได้แม้จะไม่มี session
            }
          }
        } else {
           // If no userData from checkSavedSession, clear local state
           setUser(null);
           setSessionId(null);
           if (sessionUnsubscribe) {
             sessionUnsubscribe();
             setSessionUnsubscribe(null);
           } 
        }
      } catch (err) {
        console.error('Error checking saved session:', err);
        setUser(null); // Clear user on error
        // Also clear session ID state and unsubscribe
        setSessionId(null);
        if (sessionUnsubscribe) {
          sessionUnsubscribe();
          setSessionUnsubscribe(null);
        }
      } finally {
        // Crucially, set loading to false regardless of outcome
        setIsLoading(false);
        devLog(`checkSession completed, isLoading set to false.`);
      }
    };

    // On component mount, check if there's a saved session
    checkSession();

    // Add event listeners for activity tracking
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const currentThrottledReset = throttledReset; // Capture current throttledReset
    events.forEach(event => {
      window.addEventListener(event, currentThrottledReset);
    });

    // Set up inactivity timer
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT && user) {
        console.log('Session timed out due to inactivity');
        logout(); // Use captured logout
        router.push('/login?reason=session_expired');
      }
    }, 60000); // Check every minute

    // Clean up function
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, currentThrottledReset);
      });
      clearInterval(intervalId);
      // Cleanup session watcher on unmount or dependency change
      if (sessionUnsubscribe) {
        devLog('Cleaning up session watcher due to effect re-run or unmount');
        sessionUnsubscribe();
      }
    };
    // Dependency array review: 
    // - logout: Needed for inactivity timeout
    // - lastActivity: Needed for inactivity timeout calculation
    // - router: Needed for redirect on timeout
    // - throttledReset: Needed for activity listeners
    // - user: Check if user exists for timeout
    // - initialCachedUser: Used only for initial log, could be removed if log is adjusted
    // - handleSessionChange: Needed for session watcher
    // - sessionUnsubscribe: Needed for cleanup
    // Removed user from dependency array to prevent potential loops on setUser inside checkSession
    // Let's refine dependencies further if needed, but start with this core set.
  }, [logout, lastActivity, router, throttledReset, initialCachedUser, handleSessionChange, sessionUnsubscribe]);

  // จัดการกับการปิดเบราว์เซอร์
  useEffect(() => {
    // ฟังก์ชันจัดการเมื่อผู้ใช้ปิดเบราว์เซอร์
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      devLog('Browser is closing, attempting to end session');
      
      // กรณีที่มีการล็อกอินแล้ว ให้แสดงข้อความยืนยันก่อนปิดหน้า
      if (user?.uid) {
        // ข้อความเตือนผู้ใช้
        const message = "คุณกำลังจะออกจากระบบ คุณแน่ใจหรือไม่?";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
      
      // กรณีที่เป็นการ refresh ปกติ (ไม่ใช่ปิดเบราว์เซอร์)
      if (event.type === 'beforeunload') {
        // ไม่ต้องทำอะไรกับ session หากเป็นการ refresh
        return;
      }
      
      // ถ้ามี user และ sessionId ให้สิ้นสุด session เฉพาะกรณีปิดเบราว์เซอร์จริงๆ
      if (user?.uid && sessionId) {
        try {
          // พยายามสิ้นสุด session โดยไม่รอให้เสร็จสมบูรณ์
          // เนื่องจากเบราว์เซอร์อาจปิดก่อนที่การส่งคำขอจะเสร็จสมบูรณ์
          await endUserSession(user.uid, sessionId, user);
          devLog(`Session ${sessionId} ended for user ${user.uid}`);
        } catch (error) {
          console.error('Error ending session on browser close:', error);
        }
      }
      
      // ล้าง cookies และ storage ที่เกี่ยวข้องเฉพาะเมื่อปิดเบราว์เซอร์จริงๆ
      // clearAuthCookies();
    };
    
    // ลงทะเบียนฟังก์ชันกับ beforeunload event
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    // ยกเลิกการลงทะเบียนเมื่อ component unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [user, sessionId, clearAuthCookies]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // เพิ่ม debug log
      console.log('Login attempt with username:', username);

      // Call login service
      const loginResult = await loginWithCredentials(username, password, (userData) => {
        // ตรวจสอบและแก้ไขข้อมูล user ให้ครบถ้วนก่อนเซ็ต
        if (userData) {
          console.log('User data from callback:', { 
            username: userData.username, 
            uid: userData.uid,
            hasUid: !!userData.uid
          });

          // ตรวจสอบว่ามี username และ uid หรือไม่
          if (!userData.username || !userData.uid) {
            console.warn('Incomplete user data from login, attempting to fix');
            
            // แก้ไขข้อมูลที่ขาดหายไป
            if (!userData.username && username) {
              userData.username = username.toLowerCase();
            }
            
            // ถ้ายังขาด uid ไม่ควรเซ็ตข้อมูล user
            if (!userData.uid) {
              console.error('Cannot set user: Missing uid');
              return;
            }
          }
          
          // เซ็ตข้อมูล user เมื่อข้อมูลครบถ้วน
          setUser(userData);
          console.log('User set successfully:', userData.uid);
        }
      });

      console.log('Login result:', { 
        success: loginResult.success, 
        hasUser: !!loginResult.user,
        userId: loginResult.userId,
        hasSessionId: !!loginResult.sessionId
      });

      if (loginResult.success && loginResult.user) {
        // ตรวจสอบอีกครั้งว่า user มี uid
        if (!loginResult.user.uid) {
          console.error('Login successful but user has no uid');
          
          // ถ้าไม่มี uid แต่มี userId ในผลลัพธ์ ให้ใช้ userId แทน
          if (loginResult.userId) {
            loginResult.user.uid = loginResult.userId;
            console.log('Set user.uid from loginResult.userId:', loginResult.userId);
          } else {
            setError('ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ');
            return false;
          }
        }
        
        // บันทึก session ID ถ้ามี
        if (loginResult.sessionId) {
          sessionStorage.setItem('currentSessionId', loginResult.sessionId);
          setSessionId(loginResult.sessionId);
        }
        
        // อัพเดทสถานะผู้ใช้
        setUser(loginResult.user);
        console.log('User set after successful login:', loginResult.user.uid);
        
        // นำทางไปยังหน้าที่เหมาะสมตาม role
        if (loginResult.user.role === 'admin' || loginResult.user.role === 'developer' || loginResult.user.role === 'super_admin') {
          router.push('/census/approval');
        } else {
          // ถ้าเป็น user ทั่วไปหรือ role อื่นๆ
          router.push('/census/form');
        }
        
        return true;
      }
      
      throw new Error(loginResult.error || 'ไม่สามารถเข้าสู่ระบบได้');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      console.error('Login error:', errorMessage);
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
    isLoggingOut,
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