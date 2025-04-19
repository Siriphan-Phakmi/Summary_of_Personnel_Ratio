'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading'); // Initialize as loading
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const router = useRouter();
  const pathname = usePathname();
  const { showLoading, hideLoading } = useLoading();
  
  const authService = AuthService.getInstance();

  // ฟังก์ชันตรวจสอบสิทธิ์ผู้ใช้
  const checkRole = useCallback((requiredRole?: string | string[]): boolean => {
    if (authStatus !== 'authenticated' || !user) return false;
    if (!requiredRole) return true;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (user.role === 'super_admin' || user.role === 'developer') return true;
    return roles.includes(user.role);
  }, [user, authStatus]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);
  const throttledReset = useCallback(throttle(resetInactivityTimer, 500), [resetInactivityTimer]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    setIsLoggingOut(true); // Indicate logout process start
    dismissAllToasts();
    devLog('Logging out...');
    try {
      if (user) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, username: user.username, role: user.role })
        });
      }
      setUser(null);
      setAuthStatus('unauthenticated'); // Set status to unauthenticated
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('is_browser_session');
      }
      devLog('Logout successful, redirecting to login.');
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null); // Still clear user
      setAuthStatus('unauthenticated'); // Ensure status is unauthenticated on error
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  }, [user, router]);

  // Initial session check effect
  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component
    setAuthStatus('loading'); // Start as loading when path changes or mounts
    devLog(`Initial effect running. Path: ${pathname}`);

    const checkSession = async () => {
      devLog('checkSession started');
      try {
        if (typeof document !== 'undefined' && !document.cookie.includes('auth_token=')) {
          devLog('No auth_token cookie found during initial check.');
          return null;
        }

        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        devLog(`checkSession response status: ${response.status}`);

        if (!response.ok) return null;

        const data = await response.json();
        devLog(`checkSession response data: authenticated=${data.authenticated}`);
        return data.authenticated && data.user ? data.user as User : null;
      } catch (error) {
        console.error('Error in checkSession:', error);
        return null;
      }
    };

    checkSession().then(sessionUser => {
      if (!isMounted) return; // Don't update state if unmounted
      
      if (sessionUser) {
        devLog(`Session valid for user: ${sessionUser.username}. Setting status to authenticated.`);
        setUser(sessionUser);
        setAuthStatus('authenticated');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('is_browser_session', 'true');
        }
      } else {
        devLog('No valid session found. Setting status to unauthenticated.');
        setUser(null);
        setAuthStatus('unauthenticated');
        // Only redirect if not already on login page
        if (pathname !== '/login') {
          devLog('Redirecting to login page due to invalid session.');
          router.replace('/login');
        }
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      devLog('Initial effect cleanup.');
      // Cancel any pending async operations if possible
    };
  }, [pathname, router]); // Rerun when pathname changes

  // Inactivity and activity update effect
  useEffect(() => {
    if (authStatus !== 'authenticated') return; // Only run timers if authenticated

    devLog('Setting up inactivity/activity timers.');
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, throttledReset));

    const inactivityInterval = setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        devLog('Session timed out due to inactivity. Logging out...');
        showErrorToast('คุณไม่ได้ใช้งานระบบนานเกินไป กรุณาเข้าสู่ระบบใหม่');
        logout();
      }
    }, 60000);

    const activityInterval = setInterval(async () => {
      if (user) {
        try {
          await fetch('/api/auth/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid })
          });
        } catch (error) {
          console.error('Error updating activity:', error);
        }
      }
    }, ACTIVITY_UPDATE_INTERVAL);

    return () => {
      devLog('Cleaning up inactivity/activity timers.');
      events.forEach(event => window.removeEventListener(event, throttledReset));
      clearInterval(inactivityInterval);
      clearInterval(activityInterval);
    };
  }, [authStatus, user, lastActivity, throttledReset, logout]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    devLog(`Attempting login for: ${username}`);
    setAuthStatus('loading'); // Set status to loading during login attempt
    showLoading();
    setError(null);
    try {
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();
      devLog(`CSRF token fetched: ${csrfToken ? 'OK' : 'Failed'}`);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, csrfToken })
      });
      devLog(`Login API response status: ${response.status}`);
      const data = await response.json();
      devLog(`Login API response data: success=${data.success}, user=${data.user?.username}`);

      if (!response.ok || !data.success || !data.user) {
        const errorMsg = data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        devLog(`Login failed: ${errorMsg}`);
        setError(errorMsg);
        showErrorToast(errorMsg);
        setAuthStatus('unauthenticated'); // Set status to unauthenticated on failure
        setUser(null);
        return false;
      }

      devLog(`Login successful for user: ${data.user.username}`);
      setUser(data.user);
      setAuthStatus('authenticated'); // Set status to authenticated on success
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('is_browser_session', 'true');
      }
      // Redirect is now handled by LoginPage
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      devLog(`Login error: ${errorMessage}`);
      setError(errorMessage);
      showErrorToast(errorMessage);
      setAuthStatus('unauthenticated'); // Ensure status is unauthenticated on catch
      setUser(null);
      return false;
    } finally {
      hideLoading();
      // Do not set loading state here, let authStatus handle it
    }
  };

  // Export the auth context provider and hook
  const contextValue = {
    user,
    authStatus, // Provide authStatus instead of isLoading
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
