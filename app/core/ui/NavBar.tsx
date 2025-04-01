'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import { Button, Input } from '@/app/core/ui';
import { FiLogOut, FiUser, FiClipboard, FiCheckSquare, FiPieChart, FiUsers, FiMenu, FiX, FiLogIn } from 'react-icons/fi';
import Image from 'next/image';

// Placeholder component for loading state
const NavPlaceholder = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}></div>
);

const NavBar = () => {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // เพิ่ม state เพื่อรอให้ component mount บน client ก่อน ป้องกัน Hydration Error
  const [isClient, setIsClient] = useState(false);
  
  // หลังจาก component mount บน client แล้ว ค่อยเปลี่ยน isClient เป็น true
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const isAdmin = user?.role === 'admin';
  const isActive = (path: string) => pathname === path;
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // ฟังก์ชันจัดการการคลิกปุ่ม login
  const handleLoginClick = () => {
    router.push('/login');
  };
  
  // ใช้ isLoading หรือ !isClient เพื่อแสดง placeholder ระหว่างรอ
  // รับประกันว่าการ render ครั้งแรกจะเหมือนกันทั้ง server และ client
  const showPlaceholders = isLoading || !isClient;
  
  return (
    <nav className="sticky top-0 z-30 w-full bg-gray-900 border-b border-gray-800 shadow-xl">
      <div className="container mx-auto px-4 py-2" style={{ fontFamily: 'THSarabunNew, sans-serif' }}>
        <div className="flex items-center justify-between">
          {/* Logo (แสดงเสมอ) */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <Image
                src="/images/BPK.jpg"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full"
                alt="BPK Logo"
              />
            </Link>
          </div>

          {/* Desktop Menu Links - แสดงเมนูเสมอไม่ว่าจะล็อกอินหรือไม่ก็ตาม */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {showPlaceholders ? (
              // Placeholders for desktop links during loading
              <>
                <NavPlaceholder className="h-8 w-20" />
                <NavPlaceholder className="h-8 w-24" />
                <NavPlaceholder className="h-8 w-28" />
              </>
            ) : (
              // Always show these links, even when not logged in
              <>
                <NavLink href="/census/form" active={isActive('/census/form')} icon={<FiClipboard />} text="Form" />
                <NavLink href="/census/approval" active={isActive('/census/approval')} icon={<FiCheckSquare />} text="Approval" />
                <NavLink href="/census/dashboard" active={isActive('/census/dashboard')} icon={<FiPieChart />} text="Dashboard" />
                {/* Show User Management only for admins */}
                {isAdmin && (
                  <>
                    <NavLink href="/admin/users" active={isActive('/admin/users')} icon={<FiUsers />} text="User Management" />
                    <NavLink href="/admin/database" active={isActive('/admin/database')} icon={<FiUsers />} text="Database Management" />
                  </>
                )}
              </>
            )}
          </div>
          
          {/* User Info and Login/Logout - Desktop */}
          <div className="hidden md:flex md:items-center">
            {showPlaceholders ? (
              // Placeholder during loading
              <NavPlaceholder className="h-10 w-40" />
            ) : user ? (
              // When logged in: Show user info and logout button
              <>
                <div className="flex flex-col items-end mr-4">
                  <span className="text-xl font-medium text-gray-200">
                    {user?.firstName} {user?.lastName || ''}
                  </span>
                  <div className="text-lg text-gray-400">
                    <span>{user?.role ? `${user.role} ` : ''}</span>
                    <span>{user?.location ? (Array.isArray(user.location) ? user.location.join(', ') : String(user.location)) : ''}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => logout()} leftIcon={<FiLogOut />} style={{ fontSize: '24px' }}>Logout</Button>
              </>
            ) : (
              // When not logged in: Show login button
              <Button variant="ghost" size="sm" onClick={handleLoginClick} leftIcon={<FiLogIn />}>Login</Button>
            )}
          </div>

          {/* Mobile menu button (แสดงเสมอ) */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="p-3 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none bg-white dark:bg-gray-800 shadow-md"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <FiX className="block h-8 w-8" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-8 w-8" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg">
          {showPlaceholders ? (
            // Placeholder for mobile menu content during loading
            <div className="p-4 space-y-4">
              <NavPlaceholder className="h-10 w-full" />
              <NavPlaceholder className="h-10 w-full" />
              <NavPlaceholder className="h-10 w-full" />
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                 <NavPlaceholder className="h-16 w-full" />
              </div>
            </div>
          ) : (
            <>
              {/* Always show these links in mobile menu, even when not logged in */}
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <MobileNavLink href="/census/form" active={isActive('/census/form')} icon={<FiClipboard />} text="Form" onClick={() => setIsMenuOpen(false)} />
                <MobileNavLink href="/census/approval" active={isActive('/census/approval')} icon={<FiCheckSquare />} text="Approval" onClick={() => setIsMenuOpen(false)} />
                <MobileNavLink href="/census/dashboard" active={isActive('/census/dashboard')} icon={<FiPieChart />} text="Dashboard" onClick={() => setIsMenuOpen(false)} />
                {/* Show User Management only for admins */}
                {isAdmin && (
                  <>
                    <MobileNavLink href="/admin/users" active={isActive('/admin/users')} icon={<FiUsers />} text="User Management" onClick={() => setIsMenuOpen(false)} />
                    <MobileNavLink href="/admin/database" active={isActive('/admin/database')} icon={<FiUsers />} text="Database Management" onClick={() => setIsMenuOpen(false)} />
                  </>
                )}
              </div>
              
              {/* User section or login button */}
              <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                {user ? (
                  // User is logged in - show user info and logout
                  <>
                    <div className="flex items-center px-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FiUser className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                          {user?.firstName} {user?.lastName || ''}
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          <span>{user?.role ? `${user.role} ` : ''}</span>
                          <span>{user?.location ? (Array.isArray(user.location) ? user.location.join(', ') : String(user.location)) : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 px-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FiLogOut className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  // User is not logged in - show login button
                  <div className="px-2">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push('/login');
                      }}
                      className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiLogIn className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Login
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

// Helper component for desktop nav links
const NavLink = ({ href, active, icon, text }: { href: string; active: boolean; icon: React.ReactNode; text: string }) => {
  return (
    <Link
      href={href}
      className={`flex items-center py-2 px-3 rounded-md transition-colors text-2xl font-medium ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-300 hover:text-white hover:bg-gray-700'
      }`}
      style={{ fontSize: '32px' }}
    >
      <span className="mr-2">{icon}</span>
      <span className="text-2xl">{text}</span>
    </Link>
  );
};

// Helper component for mobile nav links
const MobileNavLink = ({ href, active, icon, text, onClick }: { href: string; active: boolean; icon: React.ReactNode; text: string; onClick: () => void }) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 py-4 rounded-md text-base font-medium ${
        active 
          ? 'bg-blue-500 text-white' 
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <span className="mr-3 text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
};

export default NavBar;
