'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { loginUser } from '../lib/dataAccess';

const AuthContext = createContext({});

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
    try {
      const result = await loginUser(username, password);
      
      if (result && result.success) {
        // Save user to localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = () => {
    try {
      localStorage.removeItem('user');
      setUser(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
