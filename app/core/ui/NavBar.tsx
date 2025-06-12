'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/features/auth/AuthContext';
import { FiMenu, FiX, FiHome, FiClipboard, FiLogOut, FiUser, FiSettings, FiCheckSquare } from 'react-icons/fi';
import { UserRole } from '@/app/core/types/user';
import NotificationBell from '@/app/features/notifications/components/NotificationBell';
import ThemeToggle from './ThemeToggle';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, label, isActive, onClick }) => {
  return (
    <Link 
      href={href}
      className={`flex items-center px-4 py-2 rounded-md transition-colors ${
        isActive 
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

const NavBar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const isDeveloper = user?.role === UserRole.DEVELOPER;
  const isApprover = user?.role === UserRole.APPROVER || isAdmin || isDeveloper;

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/features/dashboard" className="font-bold text-xl text-blue-600 dark:text-blue-400">
                BPK9 บันทึกอัตรากำลัง
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
              <NavLink
                href="/features/dashboard"
                icon={<FiHome />}
                label="หน้าหลัก"
                isActive={pathname === '/features/dashboard'}
              />
              <NavLink
                href="/census/form"
                icon={<FiClipboard />}
                label="บันทึกข้อมูล"
                isActive={pathname === '/census/form'}
              />
              {isApprover && (
                <NavLink
                  href="/census/approval"
                  icon={<FiCheckSquare />}
                  label="อนุมัติแบบฟอร์ม"
                  isActive={pathname === '/census/approval'}
                />
              )}
              {isDeveloper && (
                <NavLink
                  href="/admin/dev-tools"
                  icon={<FiSettings />}
                  label="Developer Management"
                  isActive={pathname?.startsWith('/admin/dev-tools')}
                />
              )}
              {(isAdmin || isDeveloper) && (
                <NavLink
                  href="/admin/user-management"
                  icon={<FiUser />}
                  label="User Management"
                  isActive={pathname?.startsWith('/admin/user-management')}
                />
              )}
            </div>
          </div>

          {/* Right side items */}
          <div className="hidden sm:flex sm:items-center sm:ml-6 space-x-3">
            <NotificationBell />
            <ThemeToggle />
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user.firstName || user.displayName || user.username}
                </span>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  {user.role}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                >
                  <FiLogOut />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <NotificationBell />
            <ThemeToggle />
            <button
              type="button"
              className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLink
              href="/features/dashboard"
              icon={<FiHome />}
              label="หน้าหลัก"
              isActive={pathname === '/features/dashboard'}
              onClick={closeMenu}
            />
            <NavLink
              href="/census/form"
              icon={<FiClipboard />}
              label="บันทึกข้อมูล"
              isActive={pathname === '/census/form'}
              onClick={closeMenu}
            />
            {isApprover && (
              <NavLink
                href="/census/approval"
                icon={<FiCheckSquare />}
                label="อนุมัติแบบฟอร์ม"
                isActive={pathname === '/census/approval'}
                onClick={closeMenu}
              />
            )}
            {isDeveloper && (
              <NavLink
                href="/admin/dev-tools"
                icon={<FiSettings />}
                label="Developer Management"
                isActive={pathname?.startsWith('/admin/dev-tools')}
                onClick={closeMenu}
              />
            )}
            {(isAdmin || isDeveloper) && (
              <NavLink
                href="/admin/user-management"
                icon={<FiUser />}
                label="User Management"
                isActive={pathname?.startsWith('/admin/user-management')}
                onClick={closeMenu}
              />
            )}
            {user && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {user.firstName || user.displayName || user.username}
                    </span>
                    <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <FiLogOut />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar; 