'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/app/core/types/user';
import { showErrorToast, dismissAllToasts } from '@/app/core/utils/toastUtils';
import { useLoading } from '@/app/core/components/Loading';
import { AuthService } from '@/app/core/services/AuthService';
import { auth } from '@/app/core/firebase/firebase';
import { getUserRole } from '@/app/features/auth/services/roleService';

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
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number = 0;

  const throttled = function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };

  return throttled;
};

/**
 * แสดง log
 * @param message ข้อความที่ต้องการแสดง
 */
function devLog(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUTH] ${message}`);
  }
}

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const router = useRouter();
  const pathname = usePathname();
  const { showLoading, hideLoading } = useLoading();
  
  const authService = AuthService.getInstance();

  // ฟังก์ชันตรวจสอบสิทธิ์ผู้ใช้
  const checkRole = useCallback((requiredRole?: string | string[]): boolean => {
    // ถ้าไม่มีผู้ใช้ หรือไม่มีบทบาทที่ต้องการ ถือว่าไม่มีสิทธิ์
    if (!user) return false;
    if (!requiredRole) return true;
    
    // แปลงบทบาทเป็นอาร์เรย์
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // ถ้าเป็น super_admin หรือ developer ให้มีสิทธิ์ทุกอย่าง
    if (user.role === 'super_admin' || user.role === 'developer') return true;

    // ตรวจสอบว่ามีบทบาทตรงกับที่ต้องการหรือไม่
    return roles.includes(user.role);
  }, [user]);

  // Reset inactivity timer when user interacts with the app
  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Throttle the reset function (e.g., run at most once every 500ms)
  const throttledReset = useCallback(
    throttle(resetInactivityTimer, 500),
    [resetInactivityTimer]
  );

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setIsLoggingOut(true);
      dismissAllToasts();
      
      if (user) {
        // เรียกใช้ API route สำหรับออกจากระบบ
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            username: user.username,
            role: user.role
          })
        });
      }
      
      // ล้างข้อมูลผู้ใช้
      setUser(null);
      
      // เคลียร์ session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('is_browser_session');
      }
      
      // Redirect ไปที่หน้า login
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // พยายามล้างข้อมูลผู้ใช้ถึงแม้จะมีข้อผิดพลาด
      setUser(null);
      router.replace('/login');
    } finally {
      setIsLoading(false);
      setIsLoggingOut(false);
    }
  }, [user, router]);

  // ใช้ useEffect เพื่อตรวจสอบ session เมื่อโหลดเว็บ
  useEffect(() => {
    // ฟังก์ชันตรวจสอบ session
    const checkSession = async (): Promise<User | null> => {
      try {
        console.log('Checking user session...');
        
        // ตรวจสอบก่อนว่ามี cookie หรือไม่
        if (typeof document !== 'undefined') {
          const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('auth_token='));
          if (!hasCookie) {
            console.log('No auth_token cookie found');
            return null;
          }
        }
        
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // สำคัญมากสำหรับการส่ง cookie
        });

        console.log('Session check response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.log('Session expired or invalid');
          } else {
            console.warn('Session check failed with status:', response.status);
          }
          return null;
        }

        const data = await response.json();
        console.log('Session data:', data.authenticated ? 'Authenticated' : 'Not authenticated');
        
        if (data.authenticated && data.user) {
          return data.user as User;
        }
        
        return null;
      } catch (error) {
        console.error('Error checking session:', error);
        return null;
      }
    };
    
    // เรียกใช้ฟังก์ชันตรวจสอบ session
    checkSession().then(user => {
      if (user) {
        devLog('Session valid, user: ' + user.username);
        setUser(user);
        
        // บันทึกว่าเป็น browser session เดียวกัน
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('is_browser_session', 'true');
        }
      } else {
        devLog('No valid session found');
        setUser(null);
        
        // ถ้าไม่มี session ที่ถูกต้องและไม่ได้อยู่ที่หน้า login ให้ redirect
        if (pathname !== '/login') {
          router.replace('/login');
        }
      }
    });
    
    // ตรวจสอบ session อัตโนมัติทุก 5 นาที
    const sessionInterval = setInterval(() => {
      devLog('Auto session check');
      checkSession();
    }, 5 * 60 * 1000);
    
    // ตรวจสอบ session เมื่อมีการเปลี่ยนแปลงการเชื่อมต่อ
    const handleOnline = () => {
      devLog('Back online, checking session');
      checkSession();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Cleanup
    return () => {
      clearInterval(sessionInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, [pathname, router]);

  // ใช้ useEffect สำหรับตรวจสอบ inactivity timeout
  useEffect(() => {
    if (!user) return; // ไม่ต้องตรวจสอบถ้าไม่มีผู้ใช้
    
    // ตั้งค่า event listeners สำหรับการติดตามกิจกรรม
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, throttledReset);
    });
    
    // ตรวจสอบการไม่มีกิจกรรมทุก 1 นาที
    const inactivityInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        devLog('Session timed out due to inactivity. Logging out...');
        showErrorToast('คุณไม่ได้ใช้งานระบบนานเกินไป กรุณาเข้าสู่ระบบใหม่');
        logout();
      }
    }, 60000); // 1 นาที
    
    // ตรวจสอบการใช้งานและอัพเดทเซิร์ฟเวอร์ทุก 5 นาที
    const activityInterval = setInterval(async () => {
      if (user) {
        try {
          // อัพเดตข้อมูลกิจกรรมผ่าน API
          await fetch('/api/auth/activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user.uid })
          });
        } catch (error) {
          console.error('Error updating activity:', error);
        }
      }
    }, ACTIVITY_UPDATE_INTERVAL);
    
    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
      });
      clearInterval(inactivityInterval);
      clearInterval(activityInterval);
    };
  }, [user, lastActivity, throttledReset, logout]);

  // ฟังก์ชันสำหรับเข้าสู่ระบบ
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      showLoading();
      setError(null);
      
      console.log(`[AUTH_CONTEXT] Logging in user: ${username}`);
      
      // ดึง CSRF token ก่อน
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();
      console.log(`[AUTH_CONTEXT] Retrieved CSRF token: ${csrfToken ? 'success' : 'failed'}`);
      
      // ส่งข้อมูลไปยัง API เพื่อเข้าสู่ระบบ
      console.log(`[AUTH_CONTEXT] Sending login request with CSRF token: ${csrfToken?.substr(0, 5)}...`);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // สำคัญมากเพื่อส่ง cookies
        body: JSON.stringify({
          username,
          password,
          csrfToken
        })
      });
      
      console.log(`[AUTH_CONTEXT] Login response status: ${response.status}`);
      const data = await response.json();
      console.log(`[AUTH_CONTEXT] Login response data:`, { success: data.success, message: data.message, hasUser: !!data.user });
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
      
      if (data.success && data.user) {
        console.log(`[AUTH_CONTEXT] Login successful for user: ${data.user.username}`);
        setUser(data.user);
        
        // บันทึกว่าเป็น browser session เดียวกัน
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('is_browser_session', 'true');
        }
        
        // นำทางไปยังหน้าที่เหมาะสมตาม role
        console.log(`[AUTH_CONTEXT] Redirecting user with role: ${data.user.role}`);
        if (data.user.role === 'admin' || data.user.role === 'developer' || data.user.role === 'super_admin') {
          router.push('/census/approval');
        } else {
          router.push('/census/form');
        }
        
        return true;
      } else {
        console.log(`[AUTH_CONTEXT] Login failed: ${data.error || 'Unknown error'}`);
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (error) {
      console.error('[AUTH_CONTEXT] Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      setError(errorMessage);
      showErrorToast(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
      hideLoading();
    }
  };

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