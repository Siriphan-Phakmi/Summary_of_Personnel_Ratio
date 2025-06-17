'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/features/auth';
import { useTheme } from 'next-themes';
import { Button } from './Button';
import { Sun, Moon, LogOut, User as UserIcon } from 'lucide-react';

const NavBar = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <Link href="/home" legacyBehavior>
            <a className="flex items-center space-x-2">
              <img src="/images/BPK.jpg" alt="Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-800 dark:text-white hidden sm:inline">
                Personnel Ratio
              </span>
            </a>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/census/form" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Form
            </Link>
            {user && (user.role === 'admin' || user.role === 'developer' || user.role === 'supervisor') && (
              <Link href="/census/approval" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Approval
              </Link>
            )}
            <Link href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            {user && (user.role === 'admin' || user.role === 'developer') && (
              <Link href="/admin/dev-tools" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Dev Tools
              </Link>
            )}
            {user && (user.role === 'admin' || user.role === 'developer') && (
              <Link href="/admin/user-management" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                User Management
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2 text-right">
                 <div className="hidden md:flex flex-col items-end">
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                        {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.role}
                    </span>
                 </div>
                 <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
            )}
            
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 