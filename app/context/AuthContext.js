'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, collection, query, where } from 'firebase/firestore';
import { loginUser, validateSession, invalidateSession } from '../lib/dataAccess';
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
            setUser(userData);

            // ตรวจสอบความถูกต้องของ session
            validateUserSession(userData);
          } catch (parseError) {
            console.error('Error parsing user data from sessionStorage:', parseError);
            // ล้างข้อมูลที่อาจเสียหาย
            sessionStorage.removeItem('user');
            setAuthError('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
          }
        } else {
          // ไม่พบข้อมูลผู้ใช้ใน sessionStorage - ไม่ต้องตั้งค่า error เพราะอาจเป็นแค่ผู้ใช้ยังไม่ได้เข้าสู่ระบบ
          console.log('No user data found in sessionStorage');
        }
      } catch (error) {
        console.error('Error checking sessionStorage:', error);
        setAuthError(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลผู้ใช้');
      } finally {
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
    // ตั้ง listener เพื่อติดตามการเปลี่ยนแปลงของ session
    let unsubscribe = () => {};
    
    if (user && user.uid && user.sessionId) {
      try {
        // ติดตามการเปลี่ยนแปลงของเอกสาร session ปัจจุบัน
        unsubscribe = onSnapshot(
          doc(db, 'userSessions', user.sessionId),
          (snapshot) => {
            if (snapshot.exists()) {
              const sessionData = snapshot.data();
              // ถ้า session ไม่ active แล้ว ให้ logout อัตโนมัติ
              if (!sessionData.active) {
                console.log('Session expired or invalidated, logging out...');
                logout(false); // ไม่ต้องเรียก invalidateSession เพราะ session ถูกยกเลิกไปแล้ว
              }
            } else {
              // ไม่พบ session ให้ logout
              console.log('Session not found, logging out...');
              logout(false);
            }
          },
          (error) => {
            console.error('Error listening to session changes:', error);
            setAuthError('เกิดข้อผิดพลาดในการตรวจสอบเซสชัน กรุณาลองใหม่อีกครั้ง');
          }
        );
      } catch (error) {
        console.error('Error setting up session listener:', error);
      }
    }
    
    // Clean up listener เมื่อ component unmount หรือ user เปลี่ยน
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, user?.sessionId]);

  // ฟังก์ชันตรวจสอบความถูกต้องของ session
  const validateUserSession = async (user) => {
    if (!user || !user.uid || !user.sessionId) {
      setUser(null);
      sessionStorage.removeItem('user');
      return;
    }
    
    try {
      const isValid = await validateSession(user.uid, user.sessionId);
      if (!isValid) {
        // ถ้า session ไม่ถูกต้อง ให้ logout
        console.log('Invalid session, logging out...');
        logout(false);
        setAuthError('เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
      }
    } catch (error) {
      console.error('Error validating session:', error);
      setAuthError('เกิดข้อผิดพลาดในการตรวจสอบเซสชัน กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ... rest of the code for session checking and login/logout ...

  // Login function
  const login = async (username, password) => {
    console.log('Login function called with username:', username);
    setAuthError(null);
    try {
      const result = await Promise.race([
        loginUser(username, password),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Login timeout')), 10000)
        )
      ]);
      
      if (result && result.success) {
        // สร้าง session token ใหม่
        const sessionToken = generateSessionToken();
        
        // บันทึก token ลง sessionStorage
        sessionStorage.setItem('sessionToken', sessionToken);
        sessionStorage.setItem('user', JSON.stringify(result.user));
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
            sessionId: result.user.sessionId,
            role: result.user.role,
            name: result.user.displayName,
            timestamp: new Date().toISOString(),
            action: 'Login success'
          });
        } catch (logError) {
          console.warn('Login logging failed:', logError);
        }
        
        return result;
      } else if (result && !result.success) {
        setAuthError(result.error || 'การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูลอีกครั้ง');
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error.message === 'Login timeout' 
        ? 'การเข้าสู่ระบบใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
        : (error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      );
      return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  };

  // Logout function
  const logout = (invalidateCurrentSession = true) => {
    try {
      const currentUser = user;
      
      // ล้างข้อมูลใน sessionStorage
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('sessionToken');
      
      // ยกเลิก session ปัจจุบันใน Firestore (ถ้าต้องการ)
      if (invalidateCurrentSession && currentUser && currentUser.uid && currentUser.sessionId) {
        invalidateSession(currentUser.sessionId).catch(error => {
          console.error('Error invalidating session:', error);
        });
      }
      
      // รีเซ็ต state
      setUser(null);
      setAuthError(null);
      
      console.log('Logged out successfully');
      
      // Log event แบบ fire-and-forget
      try {
        if (currentUser) {
          logEvent('user_logout', {
            userId: currentUser.uid,
            username: currentUser.username,
            timestamp: new Date().toISOString(),
            action: 'Logout'
          });
        }
      } catch (logError) {
        console.warn('Logout logging failed:', logError);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError('เกิดข้อผิดพลาดในการออกจากระบบ: ' + error.message);
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