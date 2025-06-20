'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import { useTheme } from 'next-themes';
import { Button } from './Button';
import { Sun, Moon, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { UserRole } from '@/app/features/auth/types/user';

const navLinks = [
  { href: '/census/form', label: 'Form', allowedRoles: [UserRole.NURSE, UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER] },
  { href: '/census/approval', label: 'Approval', allowedRoles: [UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER] },
  { href: '/dashboard', label: 'Dashboard', allowedRoles: [UserRole.NURSE, UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER] },
  { href: '/admin/user-management', label: 'User Management', allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER] },
  { href: '/admin/dev-tools', label: 'Dev-Tools', allowedRoles: [UserRole.DEVELOPER] },
];

const NavBar = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Mark component as mounted for theme hydration
    setMounted(true);
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMenuOpen(false);
  }, [pathname]);

  const availableLinks = user 
    ? navLinks.filter(link => link.allowedRoles.includes(user.role))
    : [];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <Link href="/home" className="flex items-center space-x-2">
            <img src="/images/BPK.jpg" alt="Logo" className="h-8 w-auto" />
            <span className="text-xl font-bold text-gray-800 dark:text-white hidden sm:inline">
              Personnel Ratio
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {availableLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {user && (
              <div className="hidden md:flex items-center space-x-2 text-right">
                 <div className="flex flex-col items-end">
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                        {user.firstName} {user.lastName}
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
              {mounted ? (
                theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" />
              )}
            </button>

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="hidden md:flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pt-2 pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              {availableLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  {link.label}
                </Link>
              ))}
              {user && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                    <div className="flex items-center px-3">
                      <UserIcon className="h-8 w-8 text-gray-600 dark:text-gray-300 mr-3" />
                      <div>
                        <div className="text-base font-medium text-gray-800 dark:text-white">{user.firstName} {user.lastName}</div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="w-full flex items-center justify-start space-x-2 mt-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar; 