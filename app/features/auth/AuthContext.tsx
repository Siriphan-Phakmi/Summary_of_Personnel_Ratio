'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, rtdb } from '@/app/core/firebase/firebase';
import { ref, get } from 'firebase/database';
import { User } from '@/app/core/types/user';
import toast from 'react-hot-toast';
import { isTokenValid, clearAuthCookies, getAuthCookie, getUserCookie } from '@/app/core/utils/authUtils';
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
  endUserSession,
  updateSessionForRefresh
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
      // เช็คว่าเป็นการรีเฟรชหน้าหรือไม่
      const isRefreshing = typeof document !== 'undefined' && 
        (document.cookie.includes('is_refreshing=true') || document.cookie.includes('was_refreshed=true'));
      
      // ตรวจสอบว่ามี session cookie อยู่หรือไม่
      const hasAuthCookie = getAuthCookie() !== null;
      const hasUserCookie = getUserCookie() !== null;
      
      if (isRefreshing && (hasAuthCookie || hasUserCookie)) {
        console.log('Page is being refreshed with existing auth cookies');
        // ถ้าเป็นการ refresh และมี cookie อยู่ ให้ใช้ข้อมูลจาก cookie ก่อน
        const cookieUser = getUserCookie();
        if (cookieUser && cookieUser.uid) {
          setUser(cookieUser);
          // ตรวจสอบ sessionId จาก sessionStorage
          const savedSessionId = sessionStorage.getItem('currentSessionId');
          if (savedSessionId) {
            setSessionId(savedSessionId);
            return; // ออกจากฟังก์ชันเลยถ้าพบข้อมูลครบ
          }
        }
      }

      setIsLoading(true);
      try {
        const userData = await checkSavedSession(user);
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
            setSessionId(savedSessionId);
          } else if (userData.uid) {
            try {
              const newSessionId = await createUserSession(userData.uid, userData.role);
              if (newSessionId) {
                sessionStorage.setItem('currentSessionId', newSessionId);
                setSessionId(newSessionId);
              }
            } catch (sessionErr) {
              console.error('Error creating new session, but continuing login:', sessionErr);
            }
          }
        } else if (isRefreshing && hasUserCookie) {
          // ถ้าไม่พบข้อมูลผู้ใช้แต่เป็นการรีเฟรชหน้า และมี cookie อยู่
          const cookieUser = getUserCookie();
          if (cookieUser && cookieUser.uid) {
            console.log('Using cookie data after refresh:', cookieUser.username || cookieUser.uid);
            setUser(cookieUser);
            
            // ตรวจสอบ sessionId จาก sessionStorage
            const savedSessionId = sessionStorage.getItem('currentSessionId');
            if (savedSessionId) {
              setSessionId(savedSessionId);
            } else if (cookieUser.uid) {
              try {
                const newSessionId = await createUserSession(cookieUser.uid, cookieUser.role);
                if (newSessionId) {
                  sessionStorage.setItem('currentSessionId', newSessionId);
                  setSessionId(newSessionId);
                }
              } catch (sessionErr) {
                console.error('Error creating new session after refresh:', sessionErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking saved session:', err);
        
        // ถ้าเป็นการรีเฟรชหน้า ให้พยายามรักษาสถานะไว้
        if (isRefreshing && (hasAuthCookie || hasUserCookie || user)) {
          console.log('Error on refresh, but keeping user state for restoration attempts');
          return; // ไม่ต้องทำอะไรต่อ ปล่อยให้ใช้ข้อมูลเดิมต่อไป
        }
      } finally {
        setIsLoading(false);
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
    // ตัวแปรเพื่อติดตามสถานะว่าเป็นการ refresh หรือการปิดหน้าจริงๆ
    let isRefreshing = false;
    
    // ฟังก์ชันติดตามการโหลดหน้า
    const handlePageLoad = () => {
      // เช็คว่ามี cookie 'is_refreshing' ซึ่งจะมีเมื่อเป็นการรีเฟรชหน้า
      const hasRefreshCookie = document.cookie.includes('is_refreshing=true');
      
      if (hasRefreshCookie) {
        devLog('Page was refreshed, restoring session');
        
        // เรียกใช้ checkSession อีกครั้งเพื่อกู้คืน session
        const checkAndRestoreSession = async () => {
          try {
            const userData = await checkSavedSession(user);
            if (userData) {
              console.log('Session restored after refresh');
              setUser(userData);
              
              // ตรวจสอบ sessionId จาก sessionStorage
              const savedSessionId = sessionStorage.getItem('currentSessionId');
              if (savedSessionId && userData.uid) {
                setSessionId(savedSessionId);
                
                // อัพเดท session ว่าเป็นการ refresh
                try {
                  await updateSessionForRefresh(userData.uid, savedSessionId);
                  devLog(`Updated session ${savedSessionId} as refreshed for user ${userData.uid}`);
                } catch (error) {
                  console.error('Error updating session after refresh:', error);
                }
              }
            }
          } catch (error) {
            console.error('Error restoring session after refresh:', error);
          }
        };
        
        checkAndRestoreSession();
      }
      
      // เซ็ตค่ากลับเป็น false เมื่อโหลดหน้าเสร็จ
      isRefreshing = false;
    };
    
    // ฟังก์ชันจัดการเมื่อมีการเริ่มนำทาง
    const handleBeforeNavigate = () => {
      // เซ็ตค่าเป็น true เมื่อเริ่มมีการนำทาง
      isRefreshing = true;
    };
    
    // ฟังก์ชันจัดการเมื่อผู้ใช้ปิดเบราว์เซอร์
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      devLog('BeforeUnload event triggered');
      
      // กรณีที่มีการล็อกอินแล้ว ให้แสดงข้อความยืนยันก่อนปิดหน้า
      if (user?.uid) {
        // ข้อความเตือนผู้ใช้
        const message = "คุณกำลังจะออกจากระบบ คุณแน่ใจหรือไม่?";
        event.preventDefault();
        event.returnValue = message;
      }
      
      // สร้าง cookie ชั่วคราวเพื่อตรวจจับว่าเป็นการ refresh หรือปิดเบราว์เซอร์
      if (typeof document !== 'undefined') {
        document.cookie = 'is_refreshing=true; max-age=5;';
      }
      
      // เนื่องจากการ refresh จะทำให้ unload และ load หน้าใหม่
      // เราจะไม่ออกจากระบบในทุกกรณี แต่จะอัพเดทสถานะ session แทน
      if (user?.uid && sessionId) {
        try {
          // อัพเดท timestamp ของ session เพื่อให้รู้ว่ายังใช้งานอยู่
          await updateSessionForRefresh(user.uid, sessionId);
          devLog(`Updated session ${sessionId} activity for user ${user.uid}`);
        } catch (error) {
          console.error('Error updating session activity on beforeunload:', error);
        }
      }
    };
    
    // ลงทะเบียนฟังก์ชันกับ event ต่างๆ
    if (typeof window !== 'undefined') {
      // สำหรับ beforeunload event
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // ใช้ pageshow/pagehide สำหรับตรวจจับการ refresh
      window.addEventListener('pageshow', (event) => {
        // เช็คว่าเป็นการโหลดจาก bfcache (back-forward cache) หรือไม่
        const isPersisted = event.persisted;
        if (isPersisted) {
          devLog('Page restored from bfcache, restoring session');
        }
        
        // เรียกฟังก์ชัน handlePageLoad เพื่อจัดการ refresh
        handlePageLoad();
      });
      
      window.addEventListener('pagehide', handleBeforeNavigate);
      
      // เช็คว่ามี cookie 'is_refreshing' เมื่อโหลดหน้า
      // ถ้ามี แสดงว่าเป็นการ refresh ไม่ใช่การเปิดเบราว์เซอร์ใหม่
      const hasRefreshCookie = document.cookie.includes('is_refreshing=true');
      if (hasRefreshCookie) {
        isRefreshing = true;
        devLog('Page is being refreshed (detected via cookie)');
        
        // ตั้งค่า cookie อายุสั้นเพื่อแยกแยะระหว่างการรีเฟรชและการเปิดแท็บใหม่
        document.cookie = 'was_refreshed=true; max-age=3;';
      }
    }
    
    // ยกเลิกการลงทะเบียนเมื่อ component unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pageshow', handlePageLoad);
        window.removeEventListener('pagehide', handleBeforeNavigate);
      }
    };
  }, [user, sessionId]);

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