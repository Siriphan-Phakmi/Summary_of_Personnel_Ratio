'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/features/auth/AuthContext';
import { FiUser, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiCheckCircle, FiX } from 'react-icons/fi';
import { toast, Toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import Button from '@/app/core/ui/Button';
import Input from '@/app/core/ui/Input';
import { generateCSRFToken, validateCSRFToken } from '@/app/core/utils/authUtils';
import { useLoading } from '@/app/core/contexts/LoadingContext';
import { showErrorToast, showSuccessToast } from '@/app/core/utils/toastUtils';

// Success toast component
const SuccessToast = ({ message, t }: { message: string; t: Toast }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-emerald-900/40 border-l-4 border-green-500 dark:border-green-400 rounded-lg shadow-lg animate-fadeIn">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50">
        <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 animate-fadeIn" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-green-800 dark:text-green-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-green-500 hover:text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">ปิด</span>
        <FiX className="h-6 w-6" />
      </button>
    </div>
  </div>
);

// Error toast component
const ErrorToast = ({ message, t }: { message: string; t: Toast }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-lg animate-fadeIn">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50">
        <FiAlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 animate-pulse" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-red-800 dark:text-red-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-red-500 hover:text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">ปิด</span>
        <FiX className="h-6 w-6" />
      </button>
    </div>
  </div>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, user, isLoading, error } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { showLoading, hideLoading } = useLoading();
  
  // Check for special login messages from URL params
  const sessionExpired = searchParams.get('reason') === 'session_expired';
  const accountLocked = searchParams.get('reason') === 'account_locked';
  const forcedLogout = searchParams.get('reason') === 'forced_logout';
  const duplicateLogin = searchParams.get('reason') === 'duplicate_login';
  
  // เพิ่ม useEffect สำหรับล้างแคชเมื่อโหลดหน้า Login
  useEffect(() => {
    // ล้างแคชเฉพาะกรณีไม่ได้มาจากการ logout (ซึ่งล้างไปแล้ว)
    if (!sessionExpired && !forcedLogout && !duplicateLogin) {
      // ล้าง cache ที่เกี่ยวข้องกับ session
      if (typeof window !== 'undefined') {
        console.log('Cleaning session cache on login page load');
        
        // ล้าง user session ID ใน session storage
        sessionStorage.removeItem('currentSessionId');
        
        // ล้าง CSRF token
        sessionStorage.removeItem('csrfToken');
        
        // ล้าง cache อื่นๆ ที่อาจเกี่ยวข้องกับการ login
        const authCookiesToClear = ['authToken', 'userData'];
        authCookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // หากมีการใช้ แคชอื่นๆ ที่เกี่ยวข้องกับ auth ลองตรวจสอบและล้างเพิ่มเติม
        if (rememberMe === false) {
          localStorage.removeItem('lastLoginUser');
        }
      }
    }
  }, [sessionExpired, forcedLogout, duplicateLogin, rememberMe]);
  
  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    console.log("LoginPage useEffect - user state changed:", { 
      user: user ? `${user.username} (role: ${user.role})` : 'null', 
      isLoading 
    });
    
    // Redirect logged-in user based on role and username
    if (user && !isLoading) {
      console.log(`Redirecting logged-in user (${user.role}, ${user.username}) to appropriate page`);
      
      // ตรวจสอบและเปลี่ยนเส้นทางตาม username
      if (user.username === 'test') {
        router.push('/census/form');
      } else if (user.username === 'admin') {
        router.push('/census/approval');
      } else if (user.username === 'bbee') {
        router.push('/admin/database');
      } else {
        // กรณีเป็น username อื่นๆ ให้ใช้ role ในการเปลี่ยนเส้นทาง
        switch (user.role) {
          case 'admin':
            router.push('/census/approval');
            break;
          case 'developer':
            router.push('/admin/database');
            break;
          default: // user role
            router.push('/census/form');
            break;
        }
      }
    }
  }, [user, isLoading, router]);

  // Show special message based on URL params
  useEffect(() => {
    if (sessionExpired) {
      showErrorToast("Your session has expired or was logged in from another device. Please log in again.");
    } else if (accountLocked) {
      showErrorToast("Your account has been locked. Please contact an administrator.");
    } else if (forcedLogout) {
      showErrorToast("You were logged out because someone logged in with your account on another device.");
    } else if (duplicateLogin) {
      showErrorToast("You have logged in from another device or browser. Please try again on this device.");
    }
  }, [sessionExpired, accountLocked, forcedLogout, duplicateLogin]);

  // Detect Caps Lock
  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      if (e instanceof KeyboardEvent && e.getModifierState) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };
    
    const handleKeyUp = (e: Event) => {
      if (e instanceof KeyboardEvent && e.getModifierState) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Load saved username if remember me was checked
  useEffect(() => {
    try {
      const savedUsername = sessionStorage.getItem('lastUsername');
      if (savedUsername) {
        setUsername(savedUsername);
      }
    } catch (err) {
      console.error('Error retrieving saved username:', err);
    }
  }, []);

  // Generate CSRF token on component load
  useEffect(() => {
    const token = generateCSRFToken();
    setCsrfToken(token);
  }, []);

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ตรวจสอบว่ามีการกรอกข้อมูลครบถ้วนหรือไม่
    if (!username || !password) {
      setLocalError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      showErrorToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    
    setLocalError(null);
    setLoginError(null);
    setIsLoggingIn(true);  // เริ่มการเข้าสู่ระบบ
    
    try {
      console.log("เริ่มกระบวนการล็อกอิน...");
      showLoading(); // แสดง global loading indicator
      
      // ทำการเข้าสู่ระบบด้วยข้อมูลที่ผู้ใช้กรอก
      const response = await login(username, password);
      
      if (response) {
        // เข้าสู่ระบบสำเร็จ
        showSuccessToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${username}`);
        
        // รีเฟรชหน้าหลังจากเข้าสู่ระบบสำเร็จ
        console.log("ล็อกอินสำเร็จ กำลังรีไดเร็ค...");
        setTimeout(() => {
          window.location.reload();
        }, 200);
      } else {
        // กรณีเข้าสู่ระบบไม่สำเร็จ แต่ไม่มีข้อความผิดพลาดชัดเจน
        console.log("ล็อกอินไม่สำเร็จ ไม่มีข้อความผิดพลาด");
        setLoginError('มีข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
        showErrorToast('มีข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      showErrorToast(err.message || 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoggingIn(false);  // สิ้นสุดการเข้าสู่ระบบ
      hideLoading(); // ซ่อน global loading indicator
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden p-6 login-page">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 md:h-20 md:w-20 flex items-center justify-center bg-white rounded-full overflow-hidden mb-4">
            <Image
              src="/images/BPK.jpg"
              width={80}
              height={80}
              alt="BPK Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">
          Daily Patient Census and Staffing
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 text-center mb-4">
            Welcome back! Please sign in to continue
          </p>
        </div>

        {/* แสดงข้อความผิดพลาด */}
        {localError && (
          <div className="my-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm dark:bg-red-900 dark:border-red-800 dark:text-red-200">
            {localError}
          </div>
        )}

        {/* แสดงข้อความผิดพลาดจากการล็อกอิน */}
        {loginError && (
          <div className="my-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm dark:bg-red-900 dark:border-red-800 dark:text-red-200">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* CSRF Token */}
          <input type="hidden" name="_csrf" value={csrfToken} />
          
          <div>
            <label htmlFor="username" className="text-base font-medium text-gray-900 dark:text-gray-100">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                className="w-full px-4 py-2 pl-10 text-xl md:text-2xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                required
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <FiUser className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-base font-medium text-gray-900 dark:text-gray-100">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="w-full px-4 py-2 pl-10 text-xl md:text-2xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                required
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <FiLock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={isLoading}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {capsLockOn && (
              <p className="mt-1 text-amber-600 dark:text-amber-500 text-lg">
                <FiAlertCircle className="inline mr-1" />
                Caps Lock is on
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-lg text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isLoading}
              isLoading={isLoggingIn}
              className="text-xl md:text-2xl py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-200"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-base text-gray-600 dark:text-gray-400">
          <p>In case of inaccessibility, please contact the system administrator.</p>
          <p>By signing in, you acknowledge and accept the hospital's internal policies.</p>
        </div>

        <div className="mt-3 text-center text-base text-gray-500">
          © {new Date().getFullYear()} BPK9 International Hospital. All rights reserved
        </div>
      </div>
    </div>
  );
} 