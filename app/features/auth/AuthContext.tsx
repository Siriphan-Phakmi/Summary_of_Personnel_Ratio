'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/app/core/types/user';
import { showErrorToast, dismissAllToasts } from '@/app/core/utils/toastUtils';
import { useLoading } from '@/app/core/components/Loading';
import { AuthService } from '@/app/core/services/AuthService';
import { auth } from '@/app/core/firebase/firebase';
import { getUserRole } from '@/app/features/auth/services/roleService';

// Define authentication status type
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Define authentication context type
interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus; // Use authStatus instead of isLoading
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

/**
 * แสดง log เฉพาะในโหมด development
 */
function devLog(message: string): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AUTH ${timestamp}] ${message}`);
  }
}

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userRef = useRef(user); // Use ref to hold the latest user state for the beacon

  const authService = AuthService.getInstance();

  // Wrap checkRole with useCallback
  const checkRole = useCallback((requiredRole?: string | string[]) => {
    if (!user || authStatus !== 'authenticated') {
      devLog(`Role check failed: No authenticated user found`);
      return false;
    }
    
    if (!requiredRole) {
      devLog(`Role check passed: No specific role required`);
      return true; // No specific role required
    }
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = roles.includes(user.role);
    
    devLog(`Role check: User role '${user.role}' against required roles [${roles.join(', ')}] - Result: ${hasRole ? 'PASS' : 'FAIL'}`);
    
    return hasRole;
  }, [user, authStatus]); // Dependencies for checkRole

  // --- Helper Functions ---
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }
    devLog('Cleared inactivity/activity timers.');
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearTimers();
    devLog('Setting inactivity timer (30 minutes).');
    inactivityTimerRef.current = setTimeout(() => {
      devLog('Inactivity timeout reached. Logging out...');
      logout();
    }, 30 * 60 * 1000); // 30 minutes
  }, [clearTimers]); // Add logout to dependency array later if needed

  const setupActivityCheck = useCallback(() => {
    devLog('Setting up periodic activity check (every 5 minutes).');
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
          devLog(`Error sending activity update: ${err}`);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }, [user?.uid]);

  // Throttle function implementation
  const throttle = (func: (...args: any[]) => void, limit: number): (...args: any[]) => void => {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  const handleUserActivity = useCallback(throttle(() => {
    devLog('User activity detected, resetting inactivity timer.');
    resetInactivityTimer();
  }, 1000 * 60), [resetInactivityTimer]); // Throttle activity reset to once per minute

  // --- Main Logic Functions ---

  const checkSession = useCallback(async () => {
    devLog('checkSession started');
    setAuthStatus('loading'); // Set to loading while checking
    setError(null);
    try {
      // ใช้ Firebase Auth โดยตรงแทนการเรียก API
      devLog('Checking user session from localStorage/cookie...');
      
      // ตรวจสอบจาก localStorage หรือ cookie
      const authService = AuthService.getInstance();
      
      // 1. ดึง auth_token จาก cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
      
      // 2. ดึงข้อมูล user จาก cookie
      const userDataCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('user_data='))
        ?.split('=')[1];
        
      let userDataFromCookie = null;
      if (userDataCookie) {
        try {
          userDataFromCookie = JSON.parse(decodeURIComponent(userDataCookie));
          devLog(`Found user data in cookie: ${userDataFromCookie.username}, role: ${userDataFromCookie.role}`);
        } catch (e) {
          devLog(`Error parsing user data from cookie: ${e}`);
        }
      }

      if (token) {
        // ถ้ามี token ให้ตรวจสอบว่ายังใช้ได้หรือไม่
        const userData = await authService.checkAuth(token);
        
        if (userData) {
          devLog(`Valid session found for user: ${userData.username || userData.uid}. Setting state.`);
          
          // ถ้าได้ userData จาก authService ให้ใช้ข้อมูลนั้น
          setUser(userData);
          setAuthStatus('authenticated');
          resetInactivityTimer();
          setupActivityCheck();
        } else if (userDataFromCookie) {
          // กรณีที่ authService ไม่สามารถหาข้อมูลได้ แต่มีข้อมูลใน cookie
          // ให้ใช้ข้อมูลจาก cookie แทน (อาจเกิดจาก token ยังไม่หมดอายุแต่ server มีปัญหา)
          devLog(`Using user data from cookie as fallback: ${userDataFromCookie.username}`);
          setUser(userDataFromCookie);
          setAuthStatus('authenticated');
          resetInactivityTimer();
          setupActivityCheck();
        } else {
          // Token ไม่ถูกต้องหรือหมดอายุ และไม่มีข้อมูลใน cookie
          devLog('Session token invalid or expired. Clearing user state.');
          setUser(null);
          setAuthStatus('unauthenticated');
          clearTimers();
          
          // ล้าง cookies ที่หมดอายุ
          document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      } else if (userDataFromCookie) {
        // กรณีที่ไม่มี token แต่มีข้อมูล user ใน cookie
        // อาจเกิดจากการเปลี่ยน page หรือรีเฟรช
        devLog(`No token but found user data in cookie: ${userDataFromCookie.username}`);
        
        // ใช้ข้อมูลจาก cookie และทำการตรวจสอบ
        const verifiedUser = await authService.checkAuth(userDataFromCookie.uid);
        
        if (verifiedUser) {
          // ถ้าตรวจสอบแล้วพบว่ามีผู้ใช้อยู่จริง
          devLog(`Verified user data from database: ${verifiedUser.username}`);
          setUser(verifiedUser);
          setAuthStatus('authenticated');
          resetInactivityTimer();
          setupActivityCheck();
          
          // สร้าง token ใหม่
          document.cookie = `auth_token=${verifiedUser.uid}; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        } else {
          // ถ้าตรวจสอบแล้วไม่พบ ให้ใช้ข้อมูลจาก cookie เป็น fallback
          devLog(`Could not verify user with database, using cookie data: ${userDataFromCookie.username}`);
          setUser(userDataFromCookie);
          setAuthStatus('authenticated');
          resetInactivityTimer();
          setupActivityCheck();
        }
      } else {
        // ไม่พบ token
        devLog('No session token found. User is unauthenticated.');
        setUser(null);
        setAuthStatus('unauthenticated');
        clearTimers();
      }
    } catch (err) {
      devLog(`Error during checkSession: ${err}`);
      setError('เกิดข้อผิดพลาดในการตรวจสอบเซสชัน');
      setUser(null);
      setAuthStatus('unauthenticated');
      clearTimers();
      
      // ล้าง token ที่อาจมีปัญหา
      if (typeof document !== 'undefined') {
        document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }
  }, [pathname, router, resetInactivityTimer, setupActivityCheck, clearTimers]);

  const login = async (username: string, password: string): Promise<boolean> => {
    devLog(`Attempting login for: ${username}`);
    setAuthStatus('loading');
    setError(null);
    try {
      // 1. Get CSRF token (from sessionStorage or generate new one)
      devLog('Getting CSRF token...');
      let csrfToken;
      if (typeof window !== 'undefined') {
        csrfToken = sessionStorage.getItem('csrfToken');
        if (!csrfToken) {
          // ถ้าไม่มีใน sessionStorage ให้สร้างใหม่
          const { generateCSRFToken } = await import('@/app/core/utils/authUtils');
          csrfToken = generateCSRFToken();
          sessionStorage.setItem('csrfToken', csrfToken);
        }
      }
      devLog('CSRF token acquired: ' + (csrfToken ? 'OK' : 'Failed'));

      // 2. Attempt login using Firebase Auth directly
      const authService = AuthService.getInstance();
      const result = await authService.login(username, password);
      
      devLog(`Login result: ${JSON.stringify(result)}`);

      if (result.success && result.user) {
        devLog(`Login successful for user: ${result.user.username || result.user.uid}, role: ${result.user.role}`);
        
        // บันทึกข้อมูลผู้ใช้ลง cookie และ localStorage
        if (typeof document !== 'undefined') {
          // บันทึก token ลง cookie (ใช้ user.uid เป็น token)
          document.cookie = `auth_token=${result.user.uid}; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
          
          // บันทึกข้อมูล user ลง cookie (ในรูปแบบ JSON string)
          const userData = JSON.stringify({
            uid: result.user.uid,
            username: result.user.username,
            role: result.user.role,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            floor: result.user.floor
          });
          document.cookie = `user_data=${encodeURIComponent(userData)}; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
          
          // บันทึกข้อมูลใน localStorage สำรอง
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('auth_token_backup', result.user.uid);
            localStorage.setItem('user_data_backup', userData);
            localStorage.setItem('auth_expires', new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
          }
          
          // บันทึกสถานะว่ายังอยู่ใน session เดียวกัน
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('is_browser_session', 'true');
            sessionStorage.setItem('lastUsername', username);
          }
        }
        
        setUser(result.user);
        setAuthStatus('authenticated');
        resetInactivityTimer();
        setupActivityCheck();
        return true;
      } else {
        const errorMessage = result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        devLog(`Login failed: ${errorMessage}`);
        setError(errorMessage);
        setUser(null);
        setAuthStatus('unauthenticated');
        showErrorToast(errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
      devLog(`Login error: ${errorMessage}`);
      setError(errorMessage);
      setUser(null);
      setAuthStatus('unauthenticated');
      showErrorToast(errorMessage);
      return false;
    }
  };

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    devLog('Starting logout process...');
    setIsLoggingOut(true);
    setError(null);
    clearTimers();
    const currentUser = user; // Capture user before clearing state

    try {
      if (currentUser) {
        devLog(`Logging out user: ${currentUser.username || currentUser.uid}`);
        // ใช้ AuthService โดยตรง
        const authService = AuthService.getInstance();
        await authService.logout(currentUser);
      } else {
        devLog('No current user, proceeding with client-side logout.');
      }
      
      // ล้าง cookies ทั้งหมด
      if (typeof document !== 'undefined') {
        document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        document.cookie = `user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      }
      
      // ล้าง localStorage backup
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token_backup');
        localStorage.removeItem('user_data_backup');
        localStorage.removeItem('auth_expires');
      }
      
      // ล้าง sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('is_browser_session');
        sessionStorage.removeItem('csrfToken');
        // ไม่ต้องล้าง lastUsername เพื่อความสะดวกในการล็อกอินครั้งต่อไป
      }
      
      // Always clear client state regardless of API call success
      setUser(null);
      setAuthStatus('unauthenticated');
      devLog('User state cleared. Redirecting to login page.');
      router.push('/login');
    } catch (err) {
      devLog(`Error during logout API call: ${err}`);
      setError('เกิดข้อผิดพลาดในการออกจากระบบ');
      // Still clear client state even if API fails
      setUser(null);
      setAuthStatus('unauthenticated');
      
      // ล้าง cookies ทั้งหมดแม้ API จะล้มเหลว
      if (typeof document !== 'undefined') {
        document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        document.cookie = `user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      }
      
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, user, router, clearTimers]);

  // Update ref whenever user state changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Effect for handling browser close / beforeunload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only attempt logout if user is currently authenticated
      if (userRef.current && authStatus === 'authenticated') {
        devLog('beforeunload: User is authenticated. Attempting to send logout beacon.');
        
        // Capture user data for the beacon
        const currentUserForBeacon = userRef.current;
        const logoutData = JSON.stringify({
          userId: currentUserForBeacon.uid,
          username: currentUserForBeacon.username,
          role: currentUserForBeacon.role,
          logoutType: 'browser_close' // Indicate reason for logout
        });

        // ไม่ใช้ sendBeacon เพื่อป้องกันการล็อกเอาท์เมื่อรีเฟรช
        devLog('Skipping automatic logout on page refresh/navigation.');
        
        // สร้าง flag ไว้บอกว่านี่เป็นการรีเฟรชไม่ใช่การปิดแท็บ
        try {
          if (typeof sessionStorage !== 'undefined') {
            // ตั้งค่า refresh flag ที่จะถูกตรวจสอบเมื่อโหลดหน้าใหม่
            sessionStorage.setItem('is_page_refresh', 'true');
            // ตั้งเวลาให้ flag หมดอายุหลังจาก 5 วินาที
            setTimeout(() => {
              sessionStorage.removeItem('is_page_refresh');
            }, 5000);
          }
        } catch (e) {
          devLog(`Error setting refresh flag: ${e}`);
        }

        // Trigger browser's confirmation dialog
        event.preventDefault(); // Standard practice
        const confirmationMessage = 'คุณต้องการออกจากระบบและปิดหน้านี้หรือไม่?';
        event.returnValue = confirmationMessage; // For older browsers
        return confirmationMessage; // For modern browsers (though message is often ignored)
      } else {
        devLog('beforeunload: No user or not authenticated, skipping beacon and prompt.');
      }
    };

    // Add listener only when authenticated
    if (authStatus === 'authenticated') {
      devLog('Adding beforeunload listener.');
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      // Ensure listener is removed if status changes to non-authenticated
      devLog('Removing beforeunload listener (user not authenticated).');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup listener on component unmount or when auth status changes
    return () => {
      devLog('Cleaning up beforeunload listener.');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [authStatus]); // Re-run when authStatus changes

  // Effect for initial session check and activity listeners
  useEffect(() => {
    devLog(`Initial AuthProvider effect running.`);
    
    // ตรวจสอบว่านี่เป็นการรีเฟรชหรือไม่
    const isRefresh = typeof sessionStorage !== 'undefined' && 
                      sessionStorage.getItem('is_page_refresh') === 'true';
    
    if (isRefresh) {
      devLog('Detected page refresh, will preserve session');
      // ล้าง flag
      sessionStorage.removeItem('is_page_refresh');
    }
    
    // Check session on initial mount
      checkSession();

    // Set up activity listeners
    devLog('Setting up activity listeners (mousemove, keydown, click)');
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    // Clean up listeners and timers on unmount
    return () => {
      devLog('Cleaning up AuthProvider effect (listeners and timers).');
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearTimers();
    };
    // Run only once on mount by having a stable dependency array
  }, [checkSession, handleUserActivity, clearTimers]);

  // Memoize the context value using useMemo
  const contextValue = useMemo(() => ({
    user,
    authStatus,
    isLoggingOut,
    login, // Assuming login doesn't need explicit memoization here if its definition is stable
    logout, // Assuming logout is already memoized with useCallback
    error,
    checkRole, // Use the memoized checkRole
  }), [
    user, 
    authStatus, 
    isLoggingOut, 
    login, 
    logout, 
    error, 
    checkRole
  ]); // Dependencies for the context value

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
