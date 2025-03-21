'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { loginUser, validateSession, invalidateSession, logoutUser } from '../lib/dataAccess';
import { logEvent } from '../utils/sessionRecording';
import { v4 as uuidv4 } from 'uuid';
import { Swal } from '../utils/alertService';

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
  authError: null,
  login: async (username, password) => {},
  logout: () => {},
  clearAuthError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Add function to clear auth errors
  const clearAuthError = () => {
    setAuthError(null);
  };

  // เพิ่มการตรวจสอบ session ทุก 1 นาที
  useEffect(() => {
    if (!user) return; // ไม่ต้องตรวจสอบถ้าไม่ได้ล็อกอิน
    
    const checkSession = async () => {
      try {
        console.log('Checking if session is still valid...');
        
        if (!user.uid || !user.sessionToken || !user.sessionId) {
          console.error('Missing user credentials for session check');
          return;
        }
        
        // ตรวจสอบว่า session ยังมีอยู่ใน Firebase หรือไม่
        const sessionRef = doc(db, 'userSessions', user.sessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
          // Session ถูกลบไปแล้ว (อาจเพราะมีการล็อกอินจากที่อื่น)
          console.warn('Session no longer exists. User might have been logged out forcefully.');
          
          // แสดงข้อความแจ้งเตือน
          Swal.fire({
            title: 'ถูกบังคับออกจากระบบ',
            text: 'บัญชีของคุณถูกล็อกอินจากอุปกรณ์อื่น คุณจะถูกนำกลับไปยังหน้าเข้าสู่ระบบ',
            icon: 'warning',
            confirmButtonText: 'ตกลง'
          });
          
          // ล้างข้อมูลการเข้าสู่ระบบ
          sessionStorage.removeItem('user');
          setUser(null);
          
          // บันทึกเหตุการณ์
          logEvent('session_terminated', {
            reason: 'Session was deleted, possibly due to login from another device',
            username: user.username,
            timestamp: new Date().toISOString()
          });
          
          // redirect ไปยังหน้า login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    };
    
    // ตรวจสอบทุก 1 นาที
    const intervalId = setInterval(checkSession, 60 * 1000);
    
    // ตรวจสอบครั้งแรกทันที
    checkSession();
    
    // ล้าง interval เมื่อ component ถูก unmount
    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    // Add timeout to prevent indefinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('Auth loading timeout reached');
        setLoading(false);
        setAuthError('การตรวจสอบสถานะผู้ใช้ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  useEffect(() => {
    // Check if user is stored in sessionStorage
    const checkSessionStorage = () => {
      console.log('Checking sessionStorage for user data');
      try {
        // ตรวจสอบว่า sessionStorage พร้อมใช้งานหรือไม่
        if (typeof window === 'undefined' || !window.sessionStorage) {
          console.log('sessionStorage is not available');
          setLoading(false);
          return;
        }
        
        const storedUser = sessionStorage.getItem('user');
        console.log('User data in sessionStorage:', storedUser ? 'Found' : 'Not found');
        
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('Successfully parsed user data');
            
            // ตรวจสอบข้อมูลพื้นฐาน
            if (userData && userData.uid && userData.username) {
              console.log('Setting user state with data from sessionStorage');
              setUser(userData);
              // ไม่ต้องตรวจสอบ session อีกต่อไป
              setLoading(false);
            } else {
              console.log('Invalid user data, missing required fields');
              sessionStorage.removeItem('user');
              setLoading(false);
            }
          } catch (parseError) {
            console.error('Error parsing user data from sessionStorage:', parseError);
            // ล้างข้อมูลที่อาจเสียหาย
            sessionStorage.removeItem('user');
            setAuthError('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
            setLoading(false);
          }
        } else {
          // ไม่พบข้อมูลผู้ใช้ใน sessionStorage
          console.log('No user data found in sessionStorage');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking sessionStorage:', error);
        setAuthError(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลผู้ใช้');
        setLoading(false);
      }
    };
    
    // หน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่า client side hydration เสร็จสมบูรณ์
    const timer = setTimeout(() => {
      checkSessionStorage();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // ติดตามการเปลี่ยนแปลงของ session
  useEffect(() => {
    // ยกเลิกการติดตาม session เนื่องจากอาจทำให้เกิดปัญหา
    console.log('Session tracking disabled for troubleshooting');
    
    // แทนที่จะใช้ listener ให้ใช้ setInterval ตรวจสอบข้อมูลผู้ใช้เป็นระยะ
    const checkInterval = setInterval(() => {
      if (user) {
        // ตรวจสอบว่า user ยังมีอยู่ใน sessionStorage หรือไม่
        const storedUser = sessionStorage.getItem('user');
        if (!storedUser) {
          console.log('User data removed from sessionStorage, logging out');
          setUser(null);
        }
      }
    }, 30000); // ตรวจสอบทุก 30 วินาที
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [user]);

  // ฟังก์ชันตรวจสอบความถูกต้องของ session (แบบง่าย)
  const validateUserSession = async (user) => {
    try {
      console.log('Basic user validation');
      
      // ตรวจสอบเฉพาะข้อมูลพื้นฐาน
      if (!user || !user.uid || !user.username) {
        console.error('Invalid user data - missing required fields');
        logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in validateUserSession:', error);
      setLoading(false);
      return false;
    }
  };

  // Login function - simplified version
  const login = async (username, password) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      console.log('[DEBUG-AUTH] Attempting login with username:', username);
      console.log('[DEBUG-AUTH] Password length:', password?.length || 0);
      
      // ตรวจสอบค่า input
      if (!username?.trim() || !password?.trim()) {
        console.error('[DEBUG-AUTH] Empty username or password');
        setAuthError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        setLoading(false);
        return {
          success: false,
          error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
        };
      }
      
      // เรียกใช้ฟังก์ชัน loginUser ที่ปรับปรุงใหม่
      const result = await loginUser(username, password);
      
      // ตรวจสอบผลลัพธ์
      if (!result || !result.success) {
        const errorMsg = result?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        console.debug('[DEBUG-AUTH] Login failed:', errorMsg);
        setAuthError(errorMsg);
        setLoading(false);
        return result || { 
          success: false,
          error: errorMsg
        };
      }
      
      console.log('[DEBUG-AUTH] Login successful, user data:', {
        uid: result.user.uid,
        username: result.user.username,
        role: result.user.role,
        department: result.user.department
      });
      
      // ตรวจสอบว่ามีข้อมูลผู้ใช้หรือไม่
      if (!result.user || !result.user.uid) {
        console.debug('[DEBUG-AUTH] User data is incomplete');
        setAuthError('ข้อมูลผู้ใช้ไม่สมบูรณ์ โปรดติดต่อผู้ดูแลระบบ');
        setLoading(false);
        return {
          success: false,
          error: 'ข้อมูลผู้ใช้ไม่สมบูรณ์'
        };
      }
      
      // บันทึกข้อมูลใน sessionStorage
      try {
        const userData = JSON.stringify(result.user);
        sessionStorage.setItem('user', userData);
        console.log('[DEBUG-AUTH] User data saved to sessionStorage, length:', userData.length);
        console.log('[DEBUG-AUTH] User department in storage:', result.user.department);
      } catch (storageError) {
        console.error('[DEBUG-AUTH] Error saving to sessionStorage:', storageError);
      }
      
      // อัปเดตสถานะผู้ใช้ใน state
      setUser(result.user);
      
      // บันทึกการเข้าสู่ระบบ
      try {
        logEvent('user_login', {
          userId: result.user.uid,
          username: result.user.username,
          role: result.user.role,
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.warn('[DEBUG-AUTH] Error logging login event:', logError);
      }
      
      // เพิ่มการแจ้งเตือนใน terminal เมื่อ login สำเร็จ
      console.log('\x1b[32m%s\x1b[0m', `🚀 USER LOGIN: ${result.user.username} (${result.user.role}) logged in at ${new Date().toLocaleString()}`);
      
      console.log('[DEBUG-AUTH] Login process complete, returning result');
      setLoading(false);
      return result;
    } catch (error) {
      console.error('[DEBUG-AUTH] Login error in AuthContext:', error);
      const errorMsg = error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
      setAuthError(errorMsg);
      setLoading(false);
      return {
        success: false,
        error: errorMsg
      };
    }
  };

  // Logout function (simplified)
  const logout = async () => {
    try {
      console.log('Logging out user');
      
      // ตรวจสอบว่ามี user ที่ล็อกอินอยู่หรือไม่
      if (user && user.uid && user.sessionToken) {
        try {
          console.log('Calling logoutUser function');
          // เรียกใช้ฟังก์ชัน logoutUser แทน invalidateSession
          const result = await logoutUser(user.uid, user.sessionToken, user.sessionId);
          if (result.success) {
            console.log('Logout successful in database');
          } else {
            console.warn('Issue during logout:', result.messages || result.error);
          }
        } catch (dbError) {
          console.error('Error during database logout:', dbError);
        }
      } else {
        // กรณีไม่มี user data ใน state แต่อาจมีใน sessionStorage
        const userData = sessionStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            if (parsedUser && parsedUser.uid && parsedUser.sessionToken) {
              console.log('Logging out user from sessionStorage data');
              await logoutUser(parsedUser.uid, parsedUser.sessionToken, parsedUser.sessionId);
            }
          } catch (parseError) {
            console.error('Error parsing user data for logout:', parseError);
          }
        }
      }
      
      // ล้างข้อมูลใน sessionStorage
      sessionStorage.removeItem('user');
      
      // รีเซ็ต state
      setUser(null);
      setAuthError(null);
      
      console.log('Logged out successfully (client-side)');
      
      // นำทางไปยังหน้า login หลังจากการออกจากระบบ
      try {
        window.location.href = '/page/login';
      } catch (navError) {
        console.error('Error navigating after logout:', navError);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const contextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    authError,
    login,
    logout,
    clearAuthError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}