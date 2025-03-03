'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../lib/dataAccess';

// Create the context
const AuthContext = createContext();

// Hook to use the Auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load user from localStorage on initial load
    const checkUser = () => {
      // Make sure we're in the browser environment before accessing localStorage
      if (typeof window !== 'undefined') {
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          console.error('Error checking auth state:', error);
        }
      }
      // Always set loading to false, even if we're on the server
      setLoading(false);
    };

    checkUser();
  }, []);

  // จัดการการเข้าสู่ระบบ
  const login = async (username, password) => {
    setLoading(true);
    try {
      console.log("กำลังพยายามล็อกอินด้วย:", username);
      
      // ลบการรองรับการล็อกอินแบบ Admin โดยตรง และใช้การเชื่อมต่อกับ Firebase เท่านั้น
      
      // เรียกใช้ loginUser จาก dataAccess.js
      const result = await loginUser(username, password);
      
      if (result && result.success) {
        // บันทึกข้อมูลผู้ใช้ลงใน localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: result?.error || 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message };
    }
  };

  // Handle logout
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
