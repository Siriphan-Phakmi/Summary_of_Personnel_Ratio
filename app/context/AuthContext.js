'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { loginUser } from '../lib/dataAccess';
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
          setUser(JSON.parse(storedUser));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking localStorage:', error);
        setLoading(false);
      }
    };
    
    checkLocalStorage();
  }, []);

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
      localStorage.removeItem('user');
      setUser(null);
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
