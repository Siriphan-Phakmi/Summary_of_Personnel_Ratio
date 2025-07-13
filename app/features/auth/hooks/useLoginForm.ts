'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/features/auth/AuthContext';
// import { generateCSRFToken } from '@/app/core/utils/authUtils';
// import { showErrorToast } from '@/app/core/utils/toastUtils';

// สร้างฟังก์ชัน generateCSRFToken แทนที่จะ import จากไฟล์ที่ไม่มีอยู่
const generateCSRFToken = (): string => {
  try {
    // สร้าง token อย่างง่ายด้วย timestamp และตัวเลขสุ่ม
    const randomPart = Math.random().toString(36).substring(2);
    const timestampPart = Date.now().toString(36);
    return `${timestampPart}_${randomPart}`;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return '';
  }
};



interface UseLoginFormReturn {
  username: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  csrfToken: string;
  isLoggingIn: boolean;
  localError: string | null;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setRememberMe: (value: boolean) => void;
  togglePasswordVisibility: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export const useLoginForm = (): UseLoginFormReturn => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { login } = useAuth();
  
  // ✅ ลบการโหลด username จาก sessionStorage
  // ใช้ server-side session management แทน

  // Generate CSRF token on component load
  useEffect(() => {
    try {
      // ✅ สร้าง CSRF token แต่ไม่เก็บใน sessionStorage
      const token = generateCSRFToken();
      console.log('Generated CSRF token locally:', token ? 'success' : 'failed');
      setCsrfToken(token);
      // ใช้ server-side CSRF protection แทน browser storage
    } catch (error) {
      console.error('Error generating CSRF token:', error);
    }
  }, []);
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      const msg = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
      setLocalError(msg);
      // No toast here, just local error state
      return;
    }
    
    if (!navigator.onLine) {
      const msg = 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาตรวจสอบการเชื่อมต่อของคุณ';
      setLocalError(msg);
      // Let the core hook handle the toast for this
      return;
    }

    setLocalError(null);
    setIsLoggingIn(true);
    
    // The login function from useAuth will handle all logic, including showing error toasts.
    // This component only needs to call it and wait for the result.
    await login(username, password);
    
    setIsLoggingIn(false);
  };

  return {
    username,
    password,
    showPassword,
    rememberMe,
    csrfToken,
    isLoggingIn,
    localError,
    setUsername,
    setPassword, 
    setRememberMe,
    togglePasswordVisibility,
    handleSubmit
  };
}; 