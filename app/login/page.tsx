'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { FiUser, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiCheckCircle, FiGlobe, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';

// Custom toast components
const SuccessToast = ({ message }: { message: string }) => (
  <div className="flex items-center w-full p-4">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30">
        <FiCheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
      </div>
    </div>
    <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{message}</div>
    <div className="ml-auto">
      <button className="-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none">
        <span className="sr-only">Dismiss</span>
        <FiX className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const ErrorToast = ({ message }: { message: string }) => (
  <div className="flex items-center w-full p-4">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30">
        <FiAlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
      </div>
    </div>
    <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{message}</div>
    <div className="ml-auto">
      <button className="-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none">
        <span className="sr-only">Dismiss</span>
        <FiX className="h-4 w-4" />
      </button>
    </div>
  </div>
);

// Simple throttle function implementation
function throttle(func: Function, limit: number) {
  let inThrottle: boolean;
  let lastResult: any;
  
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
    return lastResult;
  };
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const { login, user, isLoading, error } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('msg') === 'session_expired';
  const { theme } = useTheme();
  
  // Text translations
  const translations = {
    th: {
      title: 'BPK Personnel Ratio',
      welcome: 'ยินดีต้อนรับ! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ',
      username: 'ชื่อผู้ใช้',
      password: 'รหัสผ่าน',
      rememberMe: 'จดจำฉัน',
      signIn: 'เข้าสู่ระบบ',
      signingIn: 'กำลังเข้าสู่ระบบ...',
      capsLockOn: 'Caps Lock เปิดอยู่',
      sessionExpired: 'เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง',
      usernamePlaceholder: 'กรอกชื่อผู้ใช้ของคุณ',
      passwordPlaceholder: 'กรอกรหัสผ่านของคุณ',
      emptyFields: 'กรุณากรอกทั้งชื่อผู้ใช้และรหัสผ่าน',
      acceptPolicy: 'การเข้าสู่ระบบถือว่าคุณยอมรับนโยบายภายในของโรงพยาบาล',
      copyright: 'สงวนลิขสิทธิ์',
      accountLocked: 'บัญชีถูกล็อคชั่วคราว กรุณาลองอีกครั้งใน',
      weakPassword: 'รหัสผ่านอ่อนแอ: ควรมีตัวอักษรพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ',
      mediumPassword: 'รหัสผ่านระดับปานกลาง',
      strongPassword: 'รหัสผ่านระดับแข็งแกร่ง',
      minutes: 'นาที',
      seconds: 'วินาที',
      tooManyAttempts: 'การพยายามเข้าสู่ระบบล้มเหลวหลายครั้ง',
    },
    en: {
      title: 'BPK Personnel Ratio',
      welcome: 'Welcome back! Please sign in to continue',
      username: 'Username',
      password: 'Password',
      rememberMe: 'Remember me',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      capsLockOn: 'Caps Lock is on',
      sessionExpired: 'Your session has expired. Please log in again.',
      usernamePlaceholder: 'Enter your username',
      passwordPlaceholder: 'Enter your password',
      emptyFields: 'Please enter both username and password',
      acceptPolicy: 'By signing in, you acknowledge and accept the hospital\'s internal policies.',
      copyright: 'All rights reserved',
      accountLocked: 'Account temporarily locked. Please try again in',
      weakPassword: 'Weak password: Should include uppercase, numbers, and special characters',
      mediumPassword: 'Medium strength password',
      strongPassword: 'Strong password',
      minutes: 'minutes',
      seconds: 'seconds',
      tooManyAttempts: 'Too many failed login attempts',
    }
  };
  
  const text = translations[language];
  
  // Throttle login function to prevent brute force attacks
  const throttledLogin = useCallback(
    throttle(async (username: string, password: string) => {
      try {
        // If account is locked, prevent login attempt
        if (isLocked) return;
        
        console.log('Attempting login with:', { username, passwordLength: password.length });
        const result = await login(username, password);
        console.log('Login successful, user:', user);
        
        // Show success toast
        toast.custom(
          (t) => (
            <div className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
              <SuccessToast message={language === 'th' ? 'เข้าสู่ระบบสำเร็จ!' : 'Successfully logged in!'} />
            </div>
          ),
          { 
            duration: 3000, 
            position: 'top-center',
          }
        );
        
        // Reset failed attempts on successful login
        setFailedAttempts(0);
        localStorage.removeItem('failedLoginAttempts');
        localStorage.removeItem('loginLockUntil');
        
        // Check for abnormal login (different device/location)
        const lastLoginDevice = localStorage.getItem('lastLoginDevice');
        const currentDevice = window.navigator.userAgent;
        
        if (lastLoginDevice && lastLoginDevice !== currentDevice) {
          // In a real app, you'd want to show a more prominent warning
          console.warn('Login detected from a new device');
        }
        
        // Save current device for future logins
        localStorage.setItem('lastLoginDevice', currentDevice);
        
        return result;
      } catch (err) {
        console.error('Login error in throttledLogin:', err);
        
        // Show error toast 
        toast.custom(
          (t) => (
            <div className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
              <ErrorToast message={error || (language === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Login failed')} />
            </div>
          ),
          { 
            duration: 4000, 
            position: 'top-center',
          }
        );
        
        // Ensure loading state is reset in the component
        
        // Re-throw the error so it can be caught by the calling function
        throw err;
      }
    }, 1000), // 1 second throttle
    [login, failedAttempts, isLocked, user, language, error]
  );

  // Start countdown timer for account lock
  const startLockCountdown = (lockUntil: number) => {
    const intervalId = setInterval(() => {
      const remaining = Math.max(0, lockUntil - Date.now());
      setLockTimeRemaining(remaining);
      
      if (remaining <= 0) {
        setIsLocked(false);
        setFailedAttempts(0);
        localStorage.removeItem('failedLoginAttempts');
        localStorage.removeItem('loginLockUntil');
        clearInterval(intervalId);
      }
    }, 1000);
  };

  // Format lock time remaining
  const formatLockTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${minutes} ${text.minutes} ${seconds} ${text.seconds}`;
  };

  useEffect(() => {
    // If user is already logged in, redirect to appropriate page
    if (user && !isLoading) {
      console.log('User role:', user.role); // Debug log
      if (user.role === 'admin') {
        router.push('/approval');
      } else if (user.role === 'user') {
        router.push('/wardform');
      } else {
        console.error('Unknown user role:', user.role);
        router.push('/'); // Fallback to home if role is unknown
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // Set error from auth context
    if (error) {
      setLoginError(error);
    }
  }, [error]);

  // Load previously failed login attempts and lock status
  useEffect(() => {
    const storedAttempts = localStorage.getItem('failedLoginAttempts');
    if (storedAttempts) {
      setFailedAttempts(parseInt(storedAttempts));
    }
    
    const lockUntil = localStorage.getItem('loginLockUntil');
    if (lockUntil) {
      const lockTime = parseInt(lockUntil);
      if (lockTime > Date.now()) {
        setIsLocked(true);
        startLockCountdown(lockTime);
      } else {
        // Lock expired
        localStorage.removeItem('loginLockUntil');
        localStorage.removeItem('failedLoginAttempts');
      }
    }
  }, []);

  // Detect Caps Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState('CapsLock')) {
        setCapsLockOn(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.getModifierState('CapsLock')) {
        setCapsLockOn(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Save last used username in localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('lastUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);
  
  // Check password strength
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const strength = 
      (hasUpperCase ? 1 : 0) + 
      (hasLowerCase ? 1 : 0) + 
      (hasNumbers ? 1 : 0) + 
      (hasSpecialChars ? 1 : 0);
    
    if (password.length < 8 || strength <= 2) {
      setPasswordStrength('weak');
    } else if (strength === 3) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!username.trim() || !password.trim()) {
      setLoginError(text.emptyFields);
      return;
    }
    
    // Validate username length
    if (username.trim().length < 3) {
      setLoginError('Username must be at least 3 characters long');
      return;
    }
    
    // Save username for next login if remember me is checked
    if (rememberMe) {
      localStorage.setItem('lastUsername', username);
    } else {
      localStorage.removeItem('lastUsername');
    }
    
    // Use throttled login
    try {
      await throttledLogin(username, password);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An unexpected error occurred. Please try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gradient-to-b from-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-lg md:max-w-xl bg-gray-800 dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 md:p-10 login-page">
        <div className="flex flex-col items-center">
          <div className="h-24 w-24 md:h-32 md:w-32 flex items-center justify-center bg-white rounded-full overflow-hidden mb-6 md:mb-8">
            <Image
              src="/images/BPK.jpg"
              width={100}
              height={100}
              alt="BPK Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-400 mb-3">
            BPK Personnel Ratio
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 text-center mb-8">
            {language === 'th' ? 'ยินดีต้อนรับ! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ' : 'Welcome back! Please sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-xl font-medium text-gray-300 mb-2">
              {translations[language].username}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={language === 'th' ? 'กรอกชื่อผู้ใช้' : 'Enter your username'}
              disabled={isLoading}
              className="w-full px-5 py-4 text-xl bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xl font-medium text-gray-300 mb-2">
              {translations[language].password}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'th' ? 'กรอกรหัสผ่าน' : 'Enter your password'}
                disabled={isLoading}
                className="w-full px-5 py-4 text-xl bg-gray-700 text-white pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                disabled={isLoading}
              >
                {showPassword ? <FiEyeOff size={24} /> : <FiEye size={24} />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
            />
            <label htmlFor="remember-me" className="ml-3 block text-lg text-gray-300">
              {translations[language].rememberMe}
            </label>
          </div>

          {error && (
            <div className="bg-red-900/40 text-red-300 p-4 rounded-lg text-lg">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-75 text-xl"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {translations[language].signingIn}
                </>
              ) : (
                <>
                  <FiCheckCircle className="mr-2 h-6 w-6" />
                  {translations[language].signIn}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-lg text-gray-400">
          <p>{language === 'th' ? 'เมื่อคุณเข้าสู่ระบบ หมายถึงคุณยอมรับนโยบายการใช้งานของโรงพยาบาล' : 'By signing in, you acknowledge and accept the hospital\'s internal policies.'}</p>
        </div>

        <div className="mt-8 text-center text-lg text-gray-500">
          © {new Date().getFullYear()} BPK-9 International Hospital. All rights reserved
        </div>
      </div>
    </div>
  );
}
