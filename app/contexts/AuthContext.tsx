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
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  error: null,
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
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

  // Login function using direct database authentication instead of Firebase Email Auth
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // ลบการตรวจสอบพิเศษสำหรับผู้ใช้ "test" ที่ถูก hard code ไว้
      
      // ค้นหาผู้ใช้จาก Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username), where('active', '==', true));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setIsLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // ตรวจสอบรหัสผ่าน
      if (userData.password !== password) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setIsLoading(false);
        return;
      }

      // ตรวจสอบว่าผู้ใช้ active หรือไม่
      if (!userData.active) {
        setError('บัญชีผู้ใช้นี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        setIsLoading(false);
        return;
      }

      // สร้าง session ใหม่
      const sessionId = await createUserSession(userDoc.id, userData.username);

      // สร้างข้อมูลผู้ใช้
      const user: User = {
        uid: userDoc.id,
        email: userData.email || null,
        role: userData.role as 'user' | 'admin',
        wards: userData.wards || [],
        firstName: userData.firstName,
        lastName: userData.lastName,
      };

      setUser(user);
      
      // บันทึกข้อมูล session
      setSessionId(sessionId);
      localStorage.setItem('userId', userDoc.id);
      localStorage.setItem('sessionId', sessionId);

      // ตั้งค่า timer สำหรับตรวจสอบการหมดอายุของ session
      const cleanup = monitorUserSession(userDoc.id, sessionId, () => {
        logout();
      });
      setSessionCleanup(() => cleanup);

      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);