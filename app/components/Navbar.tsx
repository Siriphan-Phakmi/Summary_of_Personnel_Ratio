'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon, FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { useAuth } from '@/app/contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Only show theme toggle once mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  // Define menu links based on user role
  const navLinks = [
    { href: '/ward-form', label: 'Ward Form', roles: ['user', 'admin'] },
    { href: '/approval', label: 'Approval', roles: ['user', 'admin'] },
    { href: '/dashboard', label: 'Dashboard', roles: ['user', 'admin'] },
    { href: '/user-management', label: 'User Management', roles: ['admin'] },
  ].filter(link => user && link.roles.includes(user.role));

  // Don't render menu for unauthenticated users or on login page
  if (!user || pathname === '/login') {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-3 md:justify-start md:space-x-10">
          {/* Logo */}
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo-BPK-9.jpg"
                alt="BPK Logo"
                width={40}
                height={40}
                className="h-10 w-auto rounded-full"
              />
              <span className="ml-2 text-lg font-bold text-gray-800 dark:text-white">BPK Personnel Ratio</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 -my-2 md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              onClick={toggleMenu}
            >
              <span className="sr-only">Open menu</span>
              {isMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0 space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium ${
                  pathname === link.href
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Theme toggle button */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
              </button>
            )}

            {/* User info and logout */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email}
                {user?.role === 'admin' && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <FiLogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          isMenuOpen ? 'block' : 'hidden'
        } absolute top-full inset-x-0 p-2 transition transform origin-top-right md:hidden`}
      >
        <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="pt-5 pb-6 px-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-gray-800 dark:text-white">Menu</span>
              </div>
              <div className="-mr-2">
                <button
                  type="button"
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  onClick={closeMenu}
                >
                  <span className="sr-only">Close menu</span>
                  <FiX className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="mt-6">
              <nav className="grid gap-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`p-3 rounded-md ${
                      pathname === link.href
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="py-4 px-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </span>
                {user?.role === 'admin' && (
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                    Admin
                  </span>
                )}
              </div>
              
              {/* Mobile theme toggle */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'dark' ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
                </button>
              )}
            </div>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FiLogOut className="mr-2 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 