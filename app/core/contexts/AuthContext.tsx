import React, { useEffect, useState } from 'react';
import axios from 'axios';

// สร้าง interface เพื่อกำหนดรูปแบบข้อมูลใน context
interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

// กำหนดค่าเริ่มต้นให้ createContext
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  setUser: () => null,
  setIsAuthenticated: () => false,
};

const AuthContext = React.createContext<AuthContextType>(defaultAuthContext);

const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const checkSession = async () => {
    try {
      // ตรวจสอบ cookie ก่อน
      const token = getAuthCookie();
      const userData = getUserFromCookie();
      
      if (token && userData) {
        // ถ้ามี token และ user data ใน cookie ให้ใช้ข้อมูลนั้นเลย
        setUser(userData);
        setIsAuthenticated(true);
        return;
      }

      // ถ้าไม่มีข้อมูลใน cookie ให้เช็ค session กับ server
      const response = await axios.get('/api/auth/check-session');
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        // บันทึกข้อมูลลง cookie
        setAuthCookie(response.data.token);
        setUserCookie(response.data.user);
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      clearAuthState();
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setIsAuthenticated(false);
    removeAuthCookie();
    removeUserCookie();
  };

  // เพิ่ม useEffect เพื่อตรวจสอบ session เมื่อ component mount
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, setUser, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Add missing cookie functions
const getAuthCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
  return authCookie ? authCookie.split('=')[1] : null;
};

const getUserFromCookie = (): any | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const userCookie = cookies.find(cookie => cookie.trim().startsWith('user_data='));
  if (!userCookie) return null;
  try {
    return JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
  } catch (error) {
    console.error('Error parsing user cookie:', error);
    return null;
  }
};

const setAuthCookie = (token: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;
};

const setUserCookie = (userData: any) => {
  if (typeof document === 'undefined') return;
  document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=86400; SameSite=Strict`;
};

const removeAuthCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'auth_token=; path=/; max-age=0';
};

const removeUserCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'user_data=; path=/; max-age=0';
};

export { AuthProvider, useAuth }; 