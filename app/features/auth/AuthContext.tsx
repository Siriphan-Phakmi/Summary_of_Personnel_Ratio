'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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

  // ฟังก์ชันตรวจสอบสิทธิ์ผู้ใช้
  const checkRole = (requiredRole?: string | string[]): boolean => {
    if (!user || authStatus !== 'authenticated') return false;
    if (!requiredRole) return true; // No specific role required
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

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
      devLog('Calling /api/auth/session to verify token...');
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      devLog(`Session API response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        devLog(`Session API response data: authenticated=${data.authenticated}`);
        if (data.authenticated && data.user) {
          devLog(`Valid session found for user: ${data.user.username}. Setting state.`);
          setUser(data.user);
          setAuthStatus('authenticated');
          resetInactivityTimer();
          setupActivityCheck();
        } else {
          // API returned 200 OK but authenticated: false
          devLog('Session API reported unauthenticated. Clearing user state.');
          setUser(null);
          setAuthStatus('unauthenticated');
          clearTimers();
        }
      } else {
        // Response not OK (e.g., 401 Unauthorized, 500 Internal Server Error)
        const errorText = await response.text();
        devLog(`Session API request failed with status ${response.status}. Error: ${errorText}. Clearing user state.`);
        setUser(null);
        setAuthStatus('unauthenticated');
        clearTimers();
        // Optionally redirect on specific errors like 401
        if (response.status === 401 && pathname !== '/login') {
          devLog('Redirecting to login page due to 401 from session check.');
          router.push('/login');
        }
      }
    } catch (err) {
      devLog(`Error during checkSession fetch: ${err}`);
      setError('เกิดข้อผิดพลาดในการตรวจสอบเซสชัน');
      setUser(null);
      setAuthStatus('unauthenticated');
      clearTimers();
    }
  }, [pathname, router, resetInactivityTimer, setupActivityCheck, clearTimers]);

  const login = async (username: string, password: string): Promise<boolean> => {
    devLog(`Attempting login for: ${username}`);
    setAuthStatus('loading');
    setError(null);
    try {
      // 1. Get CSRF token
      devLog('Fetching CSRF token...');
      const csrfRes = await fetch('/api/auth/csrf');
      if (!csrfRes.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const { csrfToken } = await csrfRes.json();
      devLog('CSRF token fetched: OK');

      // 2. Attempt login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password, csrfToken }),
      });
      devLog(`Login API response status: ${response.status}`);

      const data = await response.json();
      devLog(`Login API response data: success=${data.success}, user=${data.user?.username}`);

      if (response.ok && data.success && data.user) {
        devLog(`Login successful for user: ${data.user.username}`);
        setUser(data.user);
        setAuthStatus('authenticated');
        resetInactivityTimer();
        setupActivityCheck();
        return true;
      } else {
        const errorMessage = data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
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
        devLog(`Calling logout API for user: ${currentUser.username}`);
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: currentUser.uid,
            username: currentUser.username,
            role: currentUser.role
          }),
        });
      } else {
        devLog('No current user, proceeding with client-side logout.');
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

        // Use sendBeacon for a higher chance of delivery on unload
        try {
          const blob = new Blob([logoutData], { type: 'application/json' });
          // ***** Comment out the sendBeacon call to prevent logout on refresh *****
          /*
          if (navigator.sendBeacon('/api/auth/logout', blob)) {
            devLog('Logout beacon successfully queued.');
          } else {
            devLog('Logout beacon failed to queue (navigator.sendBeacon returned false).');
          }
          */
          devLog('Skipping sendBeacon call in beforeunload handler to prevent logout on refresh.'); // Add log
        } catch (e) {
          devLog(`Error related to beacon (now skipped): ${e}`);
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
    // Check session only on initial mount
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
