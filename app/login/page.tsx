'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/contexts/AuthContext';
import { FiUser, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiCheckCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import { getUserLockedStatus, resetLoginAttempts } from '@/app/utils/userUtils';

// Success toast component
const SuccessToast = ({ message }: { message: string }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-emerald-900/30 border-l-4 border-green-500 dark:border-green-400 rounded-lg shadow-lg">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50">
        <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-green-800 dark:text-green-200">{message}</div>
    <div className="ml-auto">
      <button className="-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 focus:outline-none">
        <span className="sr-only">Dismiss</span>
        <FiX className="h-5 w-5" />
      </button>
    </div>
  </div>
);

// Error toast component
const ErrorToast = ({ message }: { message: string }) => (
  <div className="flex items-center w-full max-w-md p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-lg">
    <div className="flex-shrink-0 mr-3">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50">
        <FiAlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
    </div>
    <div className="flex-1 text-sm md:text-base font-medium text-red-800 dark:text-red-200">{message}</div>
    <div className="ml-auto">
      <button className="-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 focus:outline-none">
        <span className="sr-only">Dismiss</span>
        <FiX className="h-5 w-5" />
      </button>
    </div>
  </div>
);

// Max failed login attempts before locking
const MAX_FAILED_ATTEMPTS = 5;
// Lock duration in milliseconds (15 minutes)
const LOCK_DURATION = 15 * 60 * 1000;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const { login, user, isLoading, error } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  
  // Check for special login messages from URL params
  const sessionExpired = searchParams.get('reason') === 'session_expired';
  const accountLocked = searchParams.get('reason') === 'account_locked';
  const forcedLogout = searchParams.get('reason') === 'forced_logout';
  const duplicateLogin = searchParams.get('reason') === 'duplicate_login';
  
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
    
    return intervalId;
  };

  // Format lock time remaining
  const formatLockTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${minutes} minutes ${seconds} seconds`;
  };

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    if (user && !isLoading) {
      if (user.role === 'admin') {
        router.push('/approval');
      } else {
        router.push('/wardform');
      }
    }
  }, [user, isLoading, router]);

  // Show special message based on URL params
  useEffect(() => {
    if (sessionExpired) {
      toast.custom((t) => (
        <ErrorToast message="Your session has expired or was logged in from another device. Please log in again." />
      ));
    } else if (accountLocked) {
      toast.custom((t) => (
        <ErrorToast message="Your account has been locked. Please contact an administrator." />
      ));
    } else if (forcedLogout) {
      toast.custom((t) => (
        <ErrorToast message="You were logged out because someone logged in with your account on another device." />
      ));
    } else if (duplicateLogin) {
      toast.custom((t) => (
        <ErrorToast message="You have logged in from another device or browser. Please try again on this device." />
      ));
    }
  }, [sessionExpired, accountLocked, forcedLogout, duplicateLogin]);

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
        const intervalId = startLockCountdown(lockTime);
        return () => clearInterval(intervalId);
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
  
  // Load saved username if remember me was checked
  useEffect(() => {
    const savedUsername = localStorage.getItem('lastUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // Check account lock status
  useEffect(() => {
    const checkLockStatus = async () => {
      if (username) {
        const { isLocked, remainingTime } = await getUserLockedStatus(username);
        setIsAccountLocked(isLocked);
        setLockoutRemaining(remainingTime);

        // Set a timer to update the remaining time if account is locked
        if (isLocked && remainingTime > 0) {
          const timer = setInterval(() => {
            setLockoutRemaining(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                setIsAccountLocked(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        }
      }
    };

    if (username) {
      checkLockStatus();
    }
  }, [username, error]);

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (isLoading || isLocked) return;
    
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      toast.custom((t) => (
        <ErrorToast message="Please enter username and password" />
      ));
      return;
    }
    
    // Check if account is locked due to too many failed attempts
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = Date.now() + LOCK_DURATION;
      localStorage.setItem('loginLockUntil', lockUntil.toString());
      setIsLocked(true);
      const intervalId = startLockCountdown(lockUntil);
      setTimeout(() => clearInterval(intervalId), LOCK_DURATION);
      
      toast.custom((t) => (
        <ErrorToast message={`Account temporarily locked due to too many failed attempts. Please try again in ${formatLockTime(LOCK_DURATION)}`} />
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
      await login(username, password);
      
      // Reset failed attempts on successful login
      setFailedAttempts(0);
      localStorage.removeItem('failedLoginAttempts');
      
      // Show success message
      toast.custom((t) => (
        <SuccessToast message="Successfully logged in" />
      ));
    } catch (err) {
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      localStorage.setItem('failedLoginAttempts', newFailedAttempts.toString());
      
      // Show warning if approaching max attempts
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS - 1) {
        toast.custom((t) => (
          <ErrorToast message={`Warning: You have ${MAX_FAILED_ATTEMPTS - newFailedAttempts} login attempts remaining before your account is locked`} />
        ));
      } else {
        toast.custom((t) => (
          <ErrorToast message="Invalid username or password" />
        ));
      }
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleResetLockout = async () => {
    if (username) {
      const success = await resetLoginAttempts(username);
      if (success) {
        setIsAccountLocked(false);
        setLockoutRemaining(0);
        setLocalError('Account unlocked. You may now log in.');
      } else {
        setLocalError('Failed to unlock account. Please contact an administrator.');
      }
    } else {
      setLocalError('Please enter your username first');
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-lg md:max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 md:p-10 login-page">
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
          <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-600 dark:text-blue-400 mb-3">
          Daily Patient Census and Staffing
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 text-center mb-8">
            Welcome back! Please sign in to continue
          </p>
        </div>

        {isLocked ? (
          <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 p-6 rounded-lg text-lg text-center mb-6">
            <FiAlertCircle className="mx-auto mb-3 h-10 w-10" />
            <p className="font-bold mb-2">
              Account temporarily locked
            </p>
            <p>
              Too many login attempts. Please try again in {formatLockTime(lockTimeRemaining)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full px-5 py-4 pl-14 text-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                  required
                />
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <FiUser className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full px-5 py-4 pl-14 text-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                  required
                />
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <FiLock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  disabled={isLoading}
                >
                  {showPassword ? <FiEyeOff size={24} /> : <FiEye size={24} />}
                </button>
              </div>
              {capsLockOn && (
                <p className="mt-2 text-amber-600 dark:text-amber-500 text-lg">
                  <FiAlertCircle className="inline mr-2" />
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
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="remember-me" className="ml-3 block text-lg text-gray-700 dark:text-gray-300">
                Remember me
              </label>
            </div>

            {localError && (
              <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 p-4 rounded-lg text-lg">
                {localError}
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isLoading}
                isLoading={isLoading}
                className="text-xl py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In
              </Button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-lg text-gray-600 dark:text-gray-400">
          <p>By signing in, you acknowledge and accept the hospital's internal policies.</p>
        </div>

        <div className="mt-8 text-center text-lg text-gray-500">
          © {new Date().getFullYear()} BPK9 International Hospital. All rights reserved
        </div>
      </div>
    </div>
  );
}
