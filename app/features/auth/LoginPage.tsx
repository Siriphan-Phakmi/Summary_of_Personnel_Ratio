'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/features/auth/AuthContext';
import { FiUser, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiCheckCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import Button from '@/app/core/ui/Button';
import Input from '@/app/core/ui/Input';

// Success toast component
const SuccessToast = ({ message, t }: { message: string; t: any }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-emerald-900/30 border-l-4 border-green-500 dark:border-green-400 rounded-lg shadow-lg">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50">
        <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-green-800 dark:text-green-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-green-500 hover:text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">Dismiss</span>
        <FiX className="h-6 w-6" />
      </button>
    </div>
  </div>
);

// Error toast component
const ErrorToast = ({ message, t }: { message: string; t: any }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-lg">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50">
        <FiAlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-red-800 dark:text-red-200">{message}</div>
    <div className="ml-auto">
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="p-3 h-10 w-10 flex items-center justify-center rounded-md text-red-500 hover:text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 focus:outline-none transition-colors"
      >
        <span className="sr-only">Dismiss</span>
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
  const { login, user, isLoading, error } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  
  // Check for special login messages from URL params
  const sessionExpired = searchParams.get('reason') === 'session_expired';
  const accountLocked = searchParams.get('reason') === 'account_locked';
  const forcedLogout = searchParams.get('reason') === 'forced_logout';
  const duplicateLogin = searchParams.get('reason') === 'duplicate_login';
  
  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    console.log("LoginPage useEffect - user state changed:", { 
      user: user ? `${user.username} (role: ${user.role})` : 'null', 
      isLoading 
    });
    
    // Redirect any logged-in user to a simple home page
    if (user && !isLoading) {
      console.log("Redirecting logged-in user to /home");
      router.push('/home');
    }
  }, [user, isLoading, router]);

  // Show special message based on URL params
  useEffect(() => {
    if (sessionExpired) {
      toast.custom((t) => (
        <ErrorToast message="Your session has expired or was logged in from another device. Please log in again." t={t} />
      ));
    } else if (accountLocked) {
      toast.custom((t) => (
        <ErrorToast message="Your account has been locked. Please contact an administrator." t={t} />
      ));
    } else if (forcedLogout) {
      toast.custom((t) => (
        <ErrorToast message="You were logged out because someone logged in with your account on another device." t={t} />
      ));
    } else if (duplicateLogin) {
      toast.custom((t) => (
        <ErrorToast message="You have logged in from another device or browser. Please try again on this device." t={t} />
      ));
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
    const savedUsername = localStorage.getItem('lastUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (isLoading) return;
    
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      toast.custom((t) => (
        <ErrorToast message="กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" t={t} />
      ));
      return;
    }
    
    // Save username for next login if remember me is checked
    if (rememberMe) {
      localStorage.setItem('lastUsername', username);
    } else {
      localStorage.removeItem('lastUsername');
    }
    
    try {
      // Call login function from AuthContext
      const success = await login(username, password);
      
      if (success) {
        toast.custom((t) => (
          <SuccessToast message="ล็อกอินสำเร็จ" t={t} />
        ));
      } else {
        toast.custom((t) => (
          <ErrorToast message={error || "เกิดข้อผิดพลาดในการล็อกอิน"} t={t} />
        ));
      }
    } catch (err) {
      console.error("Unexpected error during login:", err);
      toast.custom((t) => (
        <ErrorToast message="เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองอีกครั้งในภายหลัง" t={t} />
      ));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gray-50 dark:bg-gray-900 px-4" style={{ fontFamily: 'THSarabunNew, sans-serif' }}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden p-6 login-page" style={{ fontFamily: 'THSarabunNew, sans-serif' }}>
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
          <h1 className="text-xl md:text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">
          Daily Patient Census and Staffing
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 text-center mb-4">
            Welcome back! Please sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full px-4 py-2 pl-10 text-base bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                required
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <FiUser className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full px-4 py-2 pl-10 text-base bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
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
              <p className="mt-1 text-amber-600 dark:text-amber-500 text-xs">
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
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>

          {localError && (
            <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 p-3 rounded-md text-sm">
              {localError}
            </div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isLoading}
              isLoading={isLoading}
              className="text-base py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-200"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
          <p>By signing in, you acknowledge and accept the hospital's internal policies.</p>
        </div>

        <div className="mt-3 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} BPK9 International Hospital. All rights reserved
        </div>
      </div>
    </div>
  );
} 