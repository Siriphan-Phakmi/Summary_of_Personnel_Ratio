'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import { useTheme } from 'next-themes';
import { Button } from './Button';
import { Sun, Moon, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { UserRole } from '@/app/features/auth/types/user';
import { cn } from '@/app/lib/utils/cn';
import NotificationBell from '@/app/features/notifications/components/NotificationBell';

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

  // ✅ NEW: Handle navigation with page refresh
  const handleNavigation = (href: string) => {
    if (pathname === href) {
      // If already on the same page, refresh it
      window.location.reload();
    } else {
      // Navigate to new page with full page reload
      window.location.href = href;
    }
  };

  const availableLinks = user 
    ? navLinks.filter(link => link.allowedRoles.includes(user.role))
    : [];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* ✅ Lean Code: Non-clickable Personnel Ratio (Brand Identity Only) */}
          <div className="flex items-center space-x-2">
            <Image 
              src="/images/BPK.jpg" 
              alt="BPK Hospital Logo" 
              width={32} 
              height={32} 
              className="h-8 w-auto"
              priority
              suppressHydrationWarning={true}
            />
            <span className="text-xl font-bold text-gray-800 dark:text-white hidden sm:inline">
              Personnel Ratio
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {availableLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavigation(link.href)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  pathname === link.href 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {link.label}
              </button>
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
                 <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" suppressHydrationWarning={true} />
              </div>
            )}
            
            {/* Notification Bell */}
            {user && <NotificationBell />}
            
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" suppressHydrationWarning={true} /> : <Moon className="h-5 w-5" suppressHydrationWarning={true} />}
              </button>
            )}

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="hidden md:flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" suppressHydrationWarning={true} />
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
                {isMenuOpen ? <X className="h-6 w-6" suppressHydrationWarning={true} /> : <Menu className="h-6 w-6" suppressHydrationWarning={true} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pt-2 pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              {availableLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavigation(link.href)}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium transition-colors text-left cursor-pointer",
                    pathname === link.href
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {link.label}
                </button>
              ))}
              {user && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                    <div className="flex items-center px-3">
                      <UserIcon className="h-8 w-8 text-gray-600 dark:text-gray-300 mr-3" suppressHydrationWarning={true} />
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
                    <LogOut className="h-5 w-5" suppressHydrationWarning={true} />
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