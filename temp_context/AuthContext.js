'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { loginUser } from '../lib/dataAccess';
import { logEvent } from '../utils/sessionRecording';

// ระยะเวลาที่ session token หมดอายุ (20 นาที)
const SESSION_EXPIRY_TIME = 20 * 60 * 1000; // 20 นาที ในมิลลิวินาที

// สร้าง session token แบบสุ่ม
const generateSessionToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
};

// Initialize with default values including the function signatures
const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async (username, password) => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check if user is stored in localStorage
    const checkLocalStorage = () => {
      console.log('Checking localStorage for user data');
      try {
        // ตรวจสอบว่า localStorage พร้อมใช้งานหรือไม่
        if (typeof window === 'undefined' || !window.localStorage) {
          console.log('localStorage is not available');
          setLoading(false);
          return;
        }
        
        const storedUser = localStorage.getItem('user');
        console.log('User data in localStorage:', storedUser ? 'Found' : 'Not found');
        
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('Successfully parsed user data');
            setUser(userData);
          } catch (parseError) {
            console.error('Error parsing user data from localStorage:', parseError);
            // ล้างข้อมูลที่อาจเสียหาย
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error checking localStorage:', error);
        setAuthError(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลผู้ใช้');
      } finally {
        setLoading(false);
      }
    };
    
    // หน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่า client side hydration เสร็จสมบูรณ์
    const timer = setTimeout(() => {
      checkLocalStorage();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // เริ่มการตรวจสอบ session อย่างสม่ำเสมอ
  useEffect(() => {
    let sessionCheckInterval;
    
    // ฟังก์ชันตรวจสอบ session สำหรับผู้ใช้ที่ login แล้ว
    const checkCurrentSession = async () => {
      if (!user || !user.uid) return;
      
      try {
        // ตรวจสอบ session ปัจจุบันจาก Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const currentSessionToken = localStorage.getItem('sessionToken');
        
        // ถ้า session token ไม่ตรงกัน แสดงว่ามีคนอื่น login เข้ามาใหม่
        if (userData.sessionToken && 
            userData.sessionToken !== currentSessionToken) {
          console.log('Another session detected, logging out');
          logout();
          alert('บัญชีของคุณถูกใช้งานที่อื่น คุณถูกออกจากระบบโดยอัตโนมัติ');
          return;
        }
        
        // ตรวจสอบว่า session หมดอายุหรือไม่
        if (userData.lastActivity) {
          const lastActivity = userData.lastActivity.toDate ? 
                               userData.lastActivity.toDate() : 
                               new Date(userData.lastActivity);
          
          const now = new Date();
          const timeDiff = now.getTime() - lastActivity.getTime();
          
          if (timeDiff > SESSION_EXPIRY_TIME) {
            console.log('Session expired, logging out');
            logout();
            alert('เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่');
            return;
          }
          
          // อัปเดตเวลากิจกรรมล่าสุด
          await updateDoc(userRef, {
            lastActivity: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    if (user && !loading) {
      // ตรวจสอบทันทีหลัง login
      checkCurrentSession();
      
      // ตั้งเวลาตรวจสอบทุก 1 นาที
      sessionCheckInterval = setInterval(checkCurrentSession, 60000);
    }
    
    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [user, loading]);

  // Login function
  const login = async (username, password) => {
    console.log('Login function called with username:', username);
    try {
      const result = await loginUser(username, password);
      if (result && result.success) {
        // สร้าง session token ใหม่
        const sessionToken = generateSessionToken();
        
        // บันทึก token ลง localStorage
        localStorage.setItem('sessionToken', sessionToken);
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        
        // บันทึก session token และเวลาลงใน Firestore
        const userRef = doc(db, 'users', result.user.uid);
        await updateDoc(userRef, {
          sessionToken: sessionToken,
          lastActivity: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
        
        // Wrap logging in try-catch
        try {
          logEvent('user_login', {
            userId: result.user.uid,
            username: username,
            role: result.user.role,
            name: result.user.displayName,
            timestamp: new Date().toISOString(),
            action: 'Login success'
          });
        } catch (logError) {
          console.warn('Login logging failed:', logError);
        }
        
        return result;
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  };

  // Logout function
  const logout = () => {
    try {
      const userId = user?.uid;
      
      // ถ้ามี user และ uid ให้ลบ session token ออกจาก Firestore
      if (userId) {
        const userRef = doc(db, 'users', userId);
        updateDoc(userRef, {
          sessionToken: null,
          lastActivity: serverTimestamp()
        }).catch(err => console.error('Error clearing session:', err));
      }
      
      // ลบข้อมูลออกจาก localStorage
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      setUser(null);
      
      // บันทึกการออกจากระบบ
      logEvent('user_logout', {
        userId,
        username: user?.username,
        role: user?.role,
        name: user?.displayName,
        timestamp: new Date().toISOString(),
        action: 'Logout success'
      });
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = user !== null;

  // Make sure login is included in the context value
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  console.log('AuthContext value:', {
    user: !!value.user,
    loading: value.loading,
    isAuthenticated: value.isAuthenticated,
    hasLogin: typeof value.login === 'function',
    hasLogout: typeof value.logout === 'function'
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
