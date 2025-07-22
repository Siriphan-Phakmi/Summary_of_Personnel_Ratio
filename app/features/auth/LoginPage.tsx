'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/features/auth/AuthContext';
import { FiUser, FiLock, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTheme } from 'next-themes';
import { Button } from '@/app/components/ui/Button';
import { FiSun, FiMoon } from 'react-icons/fi';

// Import custom hooks
import { 
  useKeyboardState, 
  useLoginForm, 
  useRedirectLogic, 
  useSessionCleanup 
} from '@/app/features/auth/hooks';

export default function LoginPage() {
  const { user, authStatus } = useAuth();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Check for special login messages from URL params
  const sessionExpired = searchParams.get('reason') === 'session_expired';
  const accountLocked = searchParams.get('reason') === 'account_locked';
  const forcedLogout = searchParams.get('reason') === 'forced_logout';
  const duplicateLogin = searchParams.get('reason') === 'duplicate_login';

  // Using custom hooks
  const { capsLockOn } = useKeyboardState();
  
  const {
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
  } = useLoginForm();
  
  // Handle redirect logic
  useRedirectLogic({
    user,
    authStatus,
    sessionExpired,
    accountLocked,
    forcedLogout,
    duplicateLogin
  });
  
  // Handle session cleanup
  useSessionCleanup({
    sessionExpired,
    forcedLogout,
    duplicateLogin,
    rememberMe
  });

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gray-50 dark:bg-gray-900 px-4">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          <span suppressHydrationWarning>
            {!mounted ? (
              <FiSun key="sun-default" size={20} suppressHydrationWarning />
            ) : theme === 'dark' ? (
              <FiSun key="sun-dark" size={20} suppressHydrationWarning />
            ) : (
              <FiMoon key="moon-light" size={20} suppressHydrationWarning />
            )}
          </span>
        </button>
      </div>
      
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden p-6 login-page">
        <div className="flex flex-col items-center">
          <div 
            className="h-16 w-16 md:h-20 md:w-20 flex items-center justify-center bg-white rounded-full overflow-hidden mb-4"
            suppressHydrationWarning
          >
            <Image
              src="/images/BPK.jpg"
              width={80}
              height={80}
              alt="BPK Logo"
              className="w-full h-full object-contain"
              suppressHydrationWarning
            />
          </div>
          <h1 
            className="text-2xl md:text-4xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2"
            suppressHydrationWarning
          >
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

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* CSRF Token */}
          <input type="hidden" name="csrfToken" value={csrfToken} />
          
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
                disabled={isLoggingIn}
                className="w-full px-4 py-2 pl-10 text-xl md:text-2xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                required
                ref={usernameInputRef}
              />
              <div 
                className="absolute inset-y-0 left-3 flex items-center pointer-events-none" 
                suppressHydrationWarning
              >
                <FiUser className="h-4 w-4 text-gray-500 dark:text-gray-400" suppressHydrationWarning />
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
                disabled={isLoggingIn}
                className="w-full px-4 py-2 pl-10 text-xl md:text-2xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                required
              />
              <div 
                className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                suppressHydrationWarning
              >
                <FiLock className="h-4 w-4 text-gray-500 dark:text-gray-400" suppressHydrationWarning />
              </div>
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={isLoggingIn}
                suppressHydrationWarning
              >
                {showPassword ? <FiEyeOff size={18} suppressHydrationWarning /> : <FiEye size={18} suppressHydrationWarning />}
              </button>
            </div>
            {capsLockOn && (
              <p 
                className="mt-1 text-amber-600 dark:text-amber-500 text-lg"
                suppressHydrationWarning
              >
                <FiAlertCircle className="inline mr-1" suppressHydrationWarning />
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
              disabled={isLoggingIn}
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
              size="lg"
              disabled={isLoggingIn}
              isLoading={isLoggingIn}
              className="w-full text-xl md:text-2xl py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-200"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-base text-gray-600 dark:text-gray-400">
          <p>In case of inaccessibility, please contact the system administrator.</p>
          <p>By signing in, you acknowledge and accept the hospital&apos;s internal policies.</p>
        </div>

        <div className="mt-3 text-center text-base text-gray-500">
          © {new Date().getFullYear()} BPK9 International Hospital. All rights reserved
        </div>
      </div>
    </div>
  );
} 