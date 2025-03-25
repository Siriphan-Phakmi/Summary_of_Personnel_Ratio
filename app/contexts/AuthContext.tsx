'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  limit,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from '@/app/lib/firebase';
import app from '@/app/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  createUserSession, 
  monitorUserSession, 
  cleanupUserSession, 
  setupBeforeUnloadHandler
} from '@/app/utils/sessionUtils';
import { ref, onValue, getDatabase, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

// Initialize Realtime Database
const rtdb = getDatabase(app);

// Constants for session management
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// User type with role
interface User {
  uid: string;
  email: string | null;
  role: 'user' | 'admin';
  wards?: string[];
  firstName?: string;
  lastName?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  remainingLoginAttempts: number;
  isLockedOut: boolean;
  lockoutEndTime: Date | null;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  error: null,
  remainingLoginAttempts: MAX_FAILED_ATTEMPTS,
  isLockedOut: false,
  lockoutEndTime: null,
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [remainingLoginAttempts, setRemainingLoginAttempts] = useState(MAX_FAILED_ATTEMPTS);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const router = useRouter();

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    // Set new timer for auto logout after inactivity
    const timer = setTimeout(() => {
      if (user) {
        toast.error('Session expired due to inactivity');
        logout();
      }
    }, SESSION_TIMEOUT_MS);
    
    setInactivityTimer(timer);
  };

  // Check if user is locked out due to too many failed attempts
  const checkIfLockedOut = async (username: string): Promise<boolean> => {
    try {
      // Check failed login attempts
      const failedLoginsRef = collection(db, 'failedLogins');
      const q = query(
        failedLoginsRef,
        where('username', '==', username),
        where('timestamp', '>=', Timestamp.fromMillis(Date.now() - LOCKOUT_DURATION_MS)),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.size >= MAX_FAILED_ATTEMPTS) {
        // Find the most recent lockout entry
        const lockoutRef = collection(db, 'lockedOutUsers');
        const lockoutQuery = query(
          lockoutRef,
          where('username', '==', username),
          where('lockedUntil', '>=', Timestamp.fromMillis(Date.now())),
          limit(1)
        );
        
        const lockoutSnapshot = await getDocs(lockoutQuery);
        
        if (!lockoutSnapshot.empty) {
          const lockoutData = lockoutSnapshot.docs[0].data();
          const lockedUntil = lockoutData.lockedUntil.toDate();
          setLockoutEndTime(lockedUntil);
          setIsLockedOut(true);
          
          // Calculate remaining attempts (0 during lockout)
          setRemainingLoginAttempts(0);
          return true;
        }
        
        // If no active lockout record but should be locked out
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        
        // Create lockout record
        await setDoc(doc(collection(db, 'lockedOutUsers')), {
          username,
          lockedAt: serverTimestamp(),
          lockedUntil: Timestamp.fromDate(lockedUntil),
          reason: 'Too many failed login attempts'
        });
        
        setLockoutEndTime(lockedUntil);
        setIsLockedOut(true);
        setRemainingLoginAttempts(0);
        return true;
      }
      
      // Update remaining attempts
      setRemainingLoginAttempts(MAX_FAILED_ATTEMPTS - querySnapshot.size);
      return false;
    } catch (error) {
      console.error("Error checking lockout status:", error);
      return false;
    }
  };

  // Record failed login attempt
  const recordFailedLoginAttempt = async (username: string): Promise<void> => {
    try {
      // Add to failed logins collection
      await setDoc(doc(collection(db, 'failedLogins')), {
        username,
        timestamp: serverTimestamp(),
        ipAddress: 'client-side-unknown', // IP should be collected server-side for security
        userAgent: navigator.userAgent
      });
      
      // Update remaining attempts
      const remainingAttempts = remainingLoginAttempts - 1;
      setRemainingLoginAttempts(remainingAttempts);
      
      // Check if should be locked out
      if (remainingAttempts <= 0) {
        await checkIfLockedOut(username);
      }
    } catch (error) {
      console.error("Error recording failed login:", error);
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          // Get user data from Firestore including role
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (!userData.active) {
              // User is deactivated
              await firebaseSignOut(auth);
              setUser(null);
              setError('Your account has been deactivated. Please contact an administrator.');
              router.push('/login');
              setIsLoading(false);
              return;
            }
            
            // Create user object
            const userObj = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: userData.role || 'user',
              wards: userData.wards || [],
              firstName: userData.firstName,
              lastName: userData.lastName,
            };
            
            setUser(userObj);
            
            // Create a new session
            const newSessionId = await createUserSession(
              firebaseUser.uid, 
              firebaseUser.email || 'anonymous'
            );
            setSessionId(newSessionId);
            
            // Update user's last login time in Firestore
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastLogin: Date.now(),
              loginCount: increment(1)
            });
            
            // Log the login with enhanced information
            await setDoc(doc(db, 'userLogs', `${firebaseUser.uid}_${Date.now()}`), {
              type: 'login',
              userId: firebaseUser.uid,
              email: firebaseUser.email,
              timestamp: serverTimestamp(),
              sessionId: newSessionId,
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              screenResolution: `${window.screen.width}x${window.screen.height}`,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });

            // Start activity monitoring and reset inactivity timer
            resetInactivityTimer();
          } else {
            // User document doesn't exist
            await firebaseSignOut(auth);
            setUser(null);
            setError('User data not found. Please contact an administrator.');
            router.push('/login');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Error fetching user data. Please try again.');
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // User activity monitoring
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      if (user) {
        resetInactivityTimer();
        
        // Update lastActive in database (throttled to avoid too many writes)
        if (user.uid && sessionId) {
          const lastUpdateKey = `lastActiveUpdate_${user.uid}`;
          const lastUpdate = parseInt(sessionStorage.getItem(lastUpdateKey) || '0');
          const now = Date.now();
          
          // Only update if last update was more than 5 minutes ago
          if (now - lastUpdate > 5 * 60 * 1000) {
            update(ref(rtdb, `userSessions/${user.uid}/sessions/${sessionId}`), {
              lastActive: now,
            }).catch(console.error);
            
            sessionStorage.setItem(lastUpdateKey, now.toString());
          }
        }
      }
    };
    
    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });

    // Clean up subscription and event listeners
    return () => {
      unsubscribe();
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [router, inactivityTimer]);

  // Monitor current session for this user
  useEffect(() => {
    if (!user || !sessionId) return;

    // Set up session monitoring
    const cleanupMonitoring = monitorUserSession(
      user.uid,
      sessionId,
      () => {
        // Session expired callback - add enhanced notification
        toast.error('Your account has been logged in on another device', {
          duration: 5000,
          icon: '🔒'
        });
        
        firebaseSignOut(auth)
          .then(() => {
            router.push('/login?msg=session_expired');
          })
          .catch(console.error);
      }
    );
    
    // Set up beforeunload handler
    const cleanupBeforeUnload = setupBeforeUnloadHandler(user.uid, sessionId);

    // Return cleanup function
    return () => {
      cleanupMonitoring();
      cleanupBeforeUnload();
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [user, sessionId, router, inactivityTimer]);

  // Check user existence before login attempt
  const checkUserExists = async (username: string): Promise<boolean> => {
    try {
      // Query Firestore directly for username instead of using Firebase Auth email methods
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '==', username)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking if user exists:", error);
      return false;
    }
  };

  // Login function with enhanced security and validation
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Special case for test user
      if (username === 'test' && password === 'root1234!') {
        console.log('Using test user credentials');
        
        // Query for a user with role "user" to use for the session
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'user'), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError('ไม่พบบัญชีผู้ใช้สำหรับการทดสอบในระบบ');
          setIsLoading(false);
          return;
        }
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const email = userData.email;
        
        try {
          // Sign in with the found user's email and the test password
          await signInWithEmailAndPassword(auth, email, password);
          
          // If successful, reset failed attempts counter
          setRemainingLoginAttempts(MAX_FAILED_ATTEMPTS);
          setIsLockedOut(false);
          setLockoutEndTime(null);
          setIsLoading(false);
          return;
        } catch (authError) {
          console.error('Error signing in with test credentials:', authError);
          // Continue with regular login flow below
        }
      }
      
      // Check if user is locked out
      if (await checkIfLockedOut(username)) {
        setError(`บัญชีถูกล็อคชั่วคราวเนื่องจากพยายามเข้าสู่ระบบผิดหลายครั้ง กรุณาลองใหม่หลังจาก ${lockoutEndTime ? new Date(lockoutEndTime).toLocaleTimeString() : '15 นาที'}`);
        setIsLoading(false);
        return;
      }
      
      // Check if user exists before attempting login
      const userExists = await checkUserExists(username);
      if (!userExists) {
        setError('ไม่พบบัญชีผู้ใช้นี้ในระบบ');
        setIsLoading(false);
        await recordFailedLoginAttempt(username);
        return;
      }
      
      // Find email using username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('ไม่พบบัญชีผู้ใช้นี้ในระบบ');
        setIsLoading(false);
        await recordFailedLoginAttempt(username);
        return;
      }
      
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      
      // Get email from user data, and provide a fallback if it's invalid
      let loginEmail = userData.email;
      
      // If email is invalid or missing '@' symbol, construct a valid email using the username
      if (!loginEmail || typeof loginEmail !== 'string' || !loginEmail.includes('@')) {
        // Use username as email address with a default domain
        loginEmail = `${username}@example.com`;
        console.log('Using constructed email for login:', loginEmail);
      }
      
      // Attempt login with email (Firebase still requires email for auth)
      await signInWithEmailAndPassword(auth, loginEmail, password);
      
      // If successful, reset failed attempts counter
      setRemainingLoginAttempts(MAX_FAILED_ATTEMPTS);
      setIsLockedOut(false);
      setLockoutEndTime(null);
      
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Record failed attempt
      await recordFailedLoginAttempt(username);
      
      // Handle different Firebase auth errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(`ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง เหลือโอกาสอีก ${remainingLoginAttempts} ครั้ง`);
      } else if (err.code === 'auth/too-many-requests') {
        setError('พยายามเข้าสู่ระบบล้มเหลวหลายครั้ง กรุณาลองใหม่ในภายหลัง');
      } else if (err.code === 'auth/user-disabled') {
        setError('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      } else if (err.code === 'auth/missing-email') {
        setError('พบข้อผิดพลาดในข้อมูลผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ');
      } else if (err.code === 'auth/invalid-email') {
        setError('รูปแบบอีเมลไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ');
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
      }
      
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      if (user && sessionId) {
        // Log the logout with enhanced information
        await setDoc(doc(db, 'userLogs', `${user.uid}_${Date.now()}`), {
          type: 'logout',
          userId: user.uid,
          email: user.email,
          timestamp: serverTimestamp(),
          sessionId: sessionId,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          logoutReason: 'user_initiated'
        });
        
        // Clean up session
        await cleanupUserSession(user.uid, sessionId);
      }
      
      // Clear the inactivity timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
      
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('An error occurred during logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    login,
    logout,
    error,
    remainingLoginAttempts,
    isLockedOut,
    lockoutEndTime
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);