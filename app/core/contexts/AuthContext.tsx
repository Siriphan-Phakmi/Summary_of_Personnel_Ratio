import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

export { AuthProvider, useAuth }; 