'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { FiUser, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Simple throttle function implementation to replace lodash/throttle
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
  const { login, user, isLoading, error, remainingLoginAttempts, isLockedOut, lockoutEndTime } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('msg') === 'session_expired';
  
  // Throttle login function to prevent brute force attacks
  const throttledLogin = useCallback(
    throttle(async (username: string, password: string) => {
      try {
        await login(username, password);
      } catch (err) {
        // Error will be handled in auth context
      }
    }, 1000), // 1 second throttle
    [login]
  );

  useEffect(() => {
    // If user is already logged in, redirect to appropriate page
    if (user && !isLoading) {
      if (user.role === 'admin') {
        router.push('/approval');
      } else {
        router.push('/ward-form');
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // Set error from auth context
    if (error) {
      setLoginError(error);
    }
  }, [error]);

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
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!username.trim() || !password.trim()) {
      setLoginError('กรุณากรอกทั้ง username และ password');
      return;
    }
    
    // Save username for next login
    localStorage.setItem('lastUsername', username);
    
    // Use throttled login
    await throttledLogin(username, password);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 font-sarabun">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg opacity-100 transition-all duration-500">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold transition-transform duration-500">
            BPK-9
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            BPK Personnel Ratio
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access the system
          </p>
        </div>

        {(loginError || sessionExpired) && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 transition-all duration-300">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  {sessionExpired ? 'Your session has expired. Please log in again.' : loginError}
                </h3>
              </div>
            </div>
          </div>
        )}

        {isLockedOut && lockoutEndTime && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Account temporarily locked
                </h3>
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  Too many failed attempts. Please try again after{' '}
                  {new Date(lockoutEndTime).toLocaleTimeString()}.
                </p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || isLockedOut}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isLockedOut}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <FiEye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {capsLockOn && (
            <div className="text-xs text-amber-600 dark:text-amber-400 ml-1 mt-2 flex items-center">
              <FiAlertTriangle className="mr-1" /> Caps Lock is on
            </div>
          )}

          {!isLockedOut && remainingLoginAttempts < 5 && remainingLoginAttempts > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 ml-1">
              {remainingLoginAttempts} login attempts remaining before temporary lockout
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isLockedOut}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
            >
              {isLoading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : null}
              Sign in
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4 text-xs text-gray-500 dark:text-gray-400">
          By signing in, you agree to our <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>.
        </div>
      </div>
      
      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} BPK Personnel Ratio System
      </div>
    </div>
  );
}
