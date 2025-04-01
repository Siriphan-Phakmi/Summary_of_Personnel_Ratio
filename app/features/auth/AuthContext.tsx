'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
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

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  // ตอนเริ่มต้น ลองดึงข้อมูล cached user มาใช้ก่อน
  const initialCachedUser = getCachedUser();
  const [user, setUser] = useState<User | null>(initialCachedUser);
  const [isLoading, setIsLoading] = useState(initialCachedUser ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const router = useRouter();
  const pathname = usePathname();

  // Logout function must be defined *before* useEffect that uses it
  const logout = useCallback(async () => {
    logoutUser(user, () => {
      setUser(null);
      router.push('/login');
    });
  }, [user, router]);

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
      // ถ้าไม่ได้ทำงานบน client หรือไม่มี user อยู่แล้ว ไม่ต้องตรวจสอบ
      if (typeof window === 'undefined' || !user) return;
      
      // ตรวจสอบว่า token ยังใช้งานได้หรือไม่
      const isValid = await isTokenValid();
      if (!isValid) {
        console.log('Token is invalid or expired');
        logout();
        router.push('/login?reason=session_expired');
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
  }, [logout, lastActivity, router, throttledReset, user, initialCachedUser]);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log(`Attempting login for username: ${username}`);
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithCredentials(username, password, (userObj) => {
        setUser(userObj);
      });

      if (!result.success) {
        setError(result.error || 'Login failed');
        return false;
      }

      // Update last login timestamp
      try {
        if (result.userId) {
          await updateDoc(doc(db, 'users', result.userId), {
            lastLogin: serverTimestamp()
          });
        }
      } catch (updateErr) {
        console.error('Failed to update last login time:', updateErr);
        // Non-critical error, continue login process
      }

      return true;
    } catch (err: any) {
      console.error('Login error caught:', err);
      setError(err.message || 'Login failed due to an unexpected error.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

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