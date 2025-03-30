'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { logLogin, logLogout, logLoginFailed } from '@/app/core/utils/logUtils';
import { User } from '@/app/core/types/user'; // Updated import path

// Define authentication context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
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

// ฟังก์ชันสำหรับตรวจสอบข้อมูล user ที่ cache ไว้ก่อนหน้านี้
const getCachedUser = (): User | null => {
  try {
    // เช็คว่าอยู่ใน browser environment หรือไม่
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    
    // ตรวจสอบทุก key ใน localStorage ที่ขึ้นต้นด้วย session_
    const allKeys = Object.keys(localStorage);
    const sessionKey = allKeys.find(key => key.startsWith('session_'));
    
    if (sessionKey) {
      const userId = sessionKey.replace('session_', '');
      const cachedUserData = localStorage.getItem(`user_data_${userId}`);
      
      if (cachedUserData) {
        return JSON.parse(cachedUserData) as User;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cached user data:', error);
    return null;
  }
}

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  // ตอนเริ่มต้น ลองดึงข้อมูล cached user มาใช้ก่อน
  const initialCachedUser = getCachedUser();
  const [user, setUser] = useState<User | null>(initialCachedUser);
  const [isLoading, setIsLoading] = useState(initialCachedUser ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupFn, setCleanupFn] = useState<(() => void) | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const router = useRouter();
  const pathname = usePathname();

  // Logout function must be defined *before* useEffect that uses it
  const logout = useCallback(async () => {
    try {
      // สำคัญ: รีเซ็ต state ก่อน
      setUser(null);
      
      // เคลียร์ข้อมูลใน localStorage ทันที
      if (typeof window !== 'undefined') {
        if (user?.uid) {
          localStorage.removeItem(`session_${user.uid}`);
          localStorage.removeItem(`user_data_${user.uid}`);
        }
        localStorage.removeItem('lastActive');
      }
      
      // ใช้ router.push แทน window.location.href เพื่อให้ทำงานกับ Fast Refresh ได้
      router.push('/login');
    } 
    catch (err) {
      console.error('Error during logout:', err);
      router.push('/login');
    }
  }, [user, router]);

  // Reset inactivity timer when user interacts with the app
  const resetInactivityTimer = useCallback(() => { 
    setLastActivity(Date.now());
  }, []); // Wrap with useCallback

  // Throttle the reset function (e.g., run at most once every 500ms)
  const throttledReset = useMemo(() => throttle(resetInactivityTimer, 500), [resetInactivityTimer]);

  useEffect(() => {
    // ถ้ามี initialCachedUser แล้ว ให้ข้ามการเซ็ต isLoading = true
    // เพื่อป้องกันการกระพริบของหน้าจอ
    if (!initialCachedUser) {
      setIsLoading(true);
    }
    
    const checkSavedSession = async () => {
      try {
        // This is just to check if there's any persistent login state
        // We're not relying on Firebase Auth's persistence anymore
        const allKeys = Object.keys(localStorage);
        const sessionKey = allKeys.find(key => key.startsWith('session_'));
        
        if (sessionKey) {
          // ตรวจสอบว่ามีการเซ็ต user จาก initialCachedUser ไปแล้วหรือไม่
          // ถ้าไม่มี ค่อยดึงจาก localStorage
          if (!user) {
            try {
              const cachedUserData = localStorage.getItem(`user_data_${sessionKey.replace('session_', '')}`);
              if (cachedUserData) {
                const parsedData = JSON.parse(cachedUserData);
                setUser(parsedData);
                // ตั้งค่า isLoading เป็น false ทันทีที่ได้ข้อมูล user จาก cache
                setIsLoading(false);
              }
            } catch (cacheErr) {
              console.error('Error reading cached user data:', cacheErr);
            }
          }

          const userId = sessionKey.replace('session_', '');
          // เรียกข้อมูล user จาก Firestore เพื่อตรวจสอบความถูกต้อง
          const userDoc = await getDoc(doc(db, 'users', userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Create user object
            const userObj: User = {
              uid: userId,
              role: userData.role || 'user',
              wards: userData.wards || [],
              firstName: userData.firstName,
              lastName: userData.lastName,
              username: userData.username
            };
            
            if (userData.active !== false) {
              setUser(userObj);
              
              // อัพเดทข้อมูลใน cache
              try {
                localStorage.setItem(`user_data_${userId}`, JSON.stringify(userObj));
              } catch (cacheErr) {
                console.error('Error caching user data:', cacheErr);
              }
              
              // Restore session
              const sessionData = JSON.parse(localStorage.getItem(sessionKey) || '{}');
              if (sessionData.sessionId) {
                // Remove session monitoring setup
                /*
                // Set up session monitoring
                const cleanupSession = monitorUserSession(
                  userId,
                  sessionData.sessionId,
                  () => {
                    logout();
                    router.push('/login?reason=session_expired');
                  }
                );
                
                setCleanupFn(() => cleanupSession);
                */
              }
            } else {
              // User is inactive
              localStorage.removeItem(sessionKey);
              localStorage.removeItem(`user_data_${userId}`);
              setUser(null);
              setError('Your account is inactive. Please contact an administrator.');
            }
          } else {
            // User document not found
            localStorage.removeItem(sessionKey);
            localStorage.removeItem(`user_data_${userId}`);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error checking saved session:', err);
        setUser(null);
      } finally {
        // ตั้งค่า isLoading เป็น false เมื่อเสร็จสิ้นกระบวนการตรวจสอบทั้งหมด
        setIsLoading(false);
      }
    };

    // On component mount, check if there's a saved session
    checkSavedSession();

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
    console.log(`Attempting login for username: ${username}`); // Debug log
    setIsLoading(true); // Set loading true at the start of login attempt
    setError(null); // Clear previous errors

    try {
      // 1. Find user by username in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.trim())); // Trim username input
      console.log('Querying Firestore for username...'); // Debug log
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('User not found');
        await logLoginFailed(username.trim(), 'user_not_found');
        setError('ไม่พบผู้ใช้นี้ในระบบ'); // เปลี่ยนข้อความเป็นภาษาไทย
        return false;
      }

      const userDocSnapshot = querySnapshot.docs[0];
      const userDoc = userDocSnapshot.data();
      const userId = userDocSnapshot.id; // Firestore document ID
      console.log(`Firestore found user doc ID: ${userId}, data:`, userDoc); // Debug log

      // 2. Check if user is active
      if (userDoc.active === false) {
        console.log('User account is inactive.'); // Debug log
        await logLoginFailed(username.trim(), 'account_inactive');
        setError('Your account is inactive. Please contact an administrator.');
        return false; // Changed from throwing error to returning false
      }

      // 3. Directly check password from Firestore
      const storedPassword = userDoc.password;
      if (!storedPassword) {
        console.error('Password not found in user document!'); // Debug log
        await logLoginFailed(username.trim(), 'missing_password');
        setError('User account configuration error (missing password). Please contact an administrator.');
        return false; // Changed from throwing error to returning false
      }

      // Debug logs for password comparison
      console.log('Input password:', password);
      console.log('Stored password:', storedPassword);
      console.log('Password types - Input:', typeof password, 'Stored:', typeof storedPassword);
      console.log('Password comparison result:', String(password).trim() === String(storedPassword).trim());

      // 4. Verify password
      if (String(password).trim() !== String(storedPassword).trim()) {
        console.log('Password incorrect');
        await logLoginFailed(username.trim(), 'invalid_password');
        setError('รหัสผ่านไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ'); // เปลี่ยนข้อความแจ้งเตือน
        return false;
      }

      console.log('Password verified successfully'); // Debug log

      // 5. Create user object and set state
      const userObj: User = {
        uid: userId,
        role: userDoc.role || 'user',
        wards: userDoc.wards || [],
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        username: userDoc.username
      };
      
      // 6. บันทึกข้อมูล session และ user ใน localStorage ทันที
      try {
        localStorage.setItem(`session_${userId}`, JSON.stringify({ 
          sessionId: Date.now().toString(),
          timestamp: Date.now()
        }));
        localStorage.setItem(`user_data_${userId}`, JSON.stringify(userObj));
      } catch (cacheErr) {
        console.error('Error caching user data:', cacheErr);
      }
      
      // ตั้งค่า user หลังจากบันทึก localStorage แล้ว
      setUser(userObj);

      // 7. Update last login timestamp
      try {
        await updateDoc(doc(db, 'users', userId), {
          lastLogin: serverTimestamp()
        });
      } catch (updateErr) {
        console.error('Failed to update last login time:', updateErr);
        // Non-critical error, continue login process
      }

      // 8. Log successful login
      await logLogin(
        userId,
        username.trim(),
        navigator.userAgent
      );
      console.log('Successful login logged.'); // Debug log

      // Don't redirect here - let the useEffect in LoginPage handle redirects
      // The state update to setUser will trigger the useEffect in LoginPage
      console.log('Login successful - navigation will be handled by LoginPage useEffect');
      return true; // Added return true for successful login

    } catch (err: any) {
      console.error('Login error caught:', err); // Log the raw error

      // Default error message
      let errorMessage = 'Login failed due to an unexpected error.';

      if (err.message) {
        errorMessage = err.message;
      }

      console.log(`Setting error state: "${errorMessage}"`); // Debug log
      setError(errorMessage);
      return false; // Return false instead of re-throwing

    } finally {
      // Ensure loading state is turned off regardless of success or failure
      console.log('Login function finished, setting isLoading to false.'); // Debug log
      setIsLoading(false);
    }
  };

  // Export the auth context provider and hook
  const contextValue = {
    user,
    isLoading,
    login,
    logout,
    error
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