'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { loginUser, validateSession, invalidateSession } from '../lib/dataAccess';
import { logEvent } from '../utils/sessionRecording';

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

  useEffect(() => {
    // Check if user is stored in localStorage
    const checkLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // ตรวจสอบความถูกต้องของ session
          validateUserSession(parsedUser);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking localStorage:', error);
        setLoading(false);
      }
    };
    
    checkLocalStorage();
    
    // ตั้ง listener เพื่อติดตามการเปลี่ยนแปลงของ session
    let unsubscribe = () => {};
    
    if (user && user.uid && user.sessionId) {
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
        }
      );
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
      localStorage.removeItem('user');
      return;
    }
    
    try {
      const isValid = await validateSession(user.uid, user.sessionId);
      if (!isValid) {
        // ถ้า session ไม่ถูกต้อง ให้ logout
        console.log('Invalid session, logging out...');
        logout(false);
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  };

  // Login function
  const login = async (username, password) => {
    console.log('Login function called with username:', username);
    try {
      const result = await loginUser(username, password);
      if (result && result.success) {
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        
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
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  };

  // Logout function
  const logout = (invalidateCurrentSession = true) => {
    try {
      const userId = user?.uid;
      const sessionId = user?.sessionId;
      
      // ถ้าต้องการยกเลิก session ปัจจุบัน
      if (invalidateCurrentSession && sessionId) {
        invalidateSession(sessionId).catch(error => {
          console.error('Error invalidating session:', error);
        });
      }
      
      localStorage.removeItem('user');
      setUser(null);
      
      logEvent('user_logout', {
        userId,
        username: user?.username,
        sessionId,
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
