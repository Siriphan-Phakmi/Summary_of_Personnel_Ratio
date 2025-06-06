'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import { Button } from '@/app/core/ui';
import { FiLogOut, FiUser, FiClipboard, FiCheckSquare, FiPieChart, FiUsers, FiMenu, FiX, FiLogIn, FiServer } from 'react-icons/fi';
import Image from 'next/image';
import { initializeClientSetup } from '@/app/config/setupDefaultData';
import NotificationBell from '@/app/features/notifications/components/NotificationBell';

// Placeholder component for loading state
const NavPlaceholder = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}></div>
);

const NavBar = () => {
  const { user, authStatus, isLoggingOut, logout } = useAuth();
  console.log("NavBar component loading with: ", { 
    user: user ? `${user.firstName} ${user.lastName}` : "No user", 
    isLoggedIn: !!user,
    authStatus,
    isLoggingOut
  });

  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // รับรองว่ามีการ render ฝั่ง client
  const [isClient, setIsClient] = useState(false);
  
  // หลังจาก component mount บน client แล้ว ค่อยเปลี่ยน isClient เป็น true
  useEffect(() => {
    setIsClient(true);
    
    // ตั้งค่าข้อมูลเริ่มต้นเมื่อโหลดหน้า NavBar
    if (user) {
      initializeClientSetup();
    }
    
    console.log("NavBar: isClient set to true");
  }, [user]);

  const isActive = (path: string) => pathname === path;
  
  // ตรวจสอบ role ของผู้ใช้งาน
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  const isDeveloper = user && user.role === 'developer';

  // แสดง log เพื่อดูค่าของตัวแปรที่สำคัญ
  useEffect(() => {
    console.log('NavBar state update:', { 
      isClient,
      isLoggedIn: !!user, 
      userRole: user?.role || 'none',
      isAdmin,
      isDeveloper,
      authStatus,
      isLoggingOut 
    });
  }, [isClient, user, isAdmin, isDeveloper, authStatus, isLoggingOut]);
  
  // ฟังก์ชันจัดการการคลิกปุ่ม login
  const handleLoginClick = () => {
    router.push('/login');
  };
  
  // ฟังก์ชันจัดการการคลิกปุ่ม logout
  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // ปรับปรุงเงื่อนไขในการแสดงปุ่ม Login/Logout
  const renderAuthButton = () => {
    console.log('renderAuthButton:', { 
      isClient, 
      authStatus,
      isLoggedIn: !!user, 
      userRole: user?.role || 'none',
      isLoggingOut 
    });
    
    // If loading, show placeholder or nothing
    if (authStatus === 'loading') {
        console.log('Auth status is loading, showing placeholder for auth button');
        return <NavPlaceholder className="h-10 w-32" />;
    }

    // If authenticated, show user info and logout button
    if (authStatus === 'authenticated' && user) {
      console.log('User is authenticated, showing Logout button for user:', user.firstName);
      return (
        <>
          <div className="flex items-center">
            <NotificationBell />
            <div className="flex flex-col items-end mr-4 ml-3">
              <span className="text-base font-medium text-gray-800 dark:text-gray-200">
                {user?.firstName} {user?.lastName || ''}
              </span>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span>{user?.role ? `${user.role} ` : ''}</span>
                <span>{user?.floor || ''}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<FiLogOut />} disabled={isLoggingOut}>
              {isLoggingOut ? "กำลังออกจากระบบ..." : "Logout"}
            </Button>
          </div>
        </>
      );
    }
    
    // If unauthenticated, show Login button
    if (authStatus === 'unauthenticated') {
        console.log('User is unauthenticated, showing Login button');
        return (
          <Button variant="ghost" size="sm" onClick={handleLoginClick} leftIcon={<FiLogIn />}>Login</Button>
        );
    }

    // Default case (should ideally not be reached)
    return null;
  };

  // ปรับปรุงเงื่อนไขในการแสดงปุ่ม Login/Logout บนโหมด Mobile
  const renderMobileAuthButton = () => {
    console.log('renderMobileAuthButton:', { 
      isClient, 
      authStatus,
      isLoggedIn: !!user, 
      userRole: user?.role || 'none',
      isLoggingOut 
    });

    // If loading, show placeholder or nothing
    if (authStatus === 'loading') {
        console.log('Auth status is loading, showing placeholder for mobile auth button');
        return <NavPlaceholder className="h-12 w-full px-4 mb-2" />;
    }
    
    // If authenticated, show user info and logout button
    if (authStatus === 'authenticated' && user) {
      console.log('User is authenticated, showing Logout button for mobile');
      return (
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
                <span>{user?.floor || ''}</span>
              </div>
            </div>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </div>
          <div className="mt-3 px-2 space-y-1">
            <button
              onClick={async () => {
                console.log("Logging out from mobile...");
                setIsMenuOpen(false);
                try {
                  await logout();
                } catch (error) {
                  console.error("Error during logout:", error);
                }
              }}
              disabled={isLoggingOut}
              className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiLogOut className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
              {isLoggingOut ? "กำลังออกจากระบบ..." : "Logout"}
            </button>
          </div>
        </>
      );
    }
    
    // If unauthenticated, show Login button
    if (authStatus === 'unauthenticated') {
        console.log('User is unauthenticated, showing Login button for mobile');
        return (
          <div className="px-2 py-3">
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
        );
    }

    // Default case
    return null;
  };
  
  return (
    <nav className="sticky top-0 z-30 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-md dark:shadow-xl">
      <div className="container mx-auto px-4 py-2">
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

          {/* Desktop Menu Links */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Form menu - ทุก Role สามารถเห็นได้ */}
            <NavLink 
              href="/census/form" 
              active={isActive('/census/form')} 
              icon={<FiClipboard />} 
              text={isAdmin ? "WardForm" : "Form"} 
            />
            
            {/* Approval menu - ทุก Role สามารถเห็นได้ */}
            <NavLink 
              href="/census/approval" 
              active={isActive('/census/approval')} 
              icon={<FiCheckSquare />} 
              text="Approval" 
            />

            {/* Dashboard menu - ทุก Role สามารถเห็นได้ */}
            <NavLink 
              href="/features/dashboard" 
              active={isActive('/features/dashboard')} 
              icon={<FiPieChart />} 
              text="Dashboard" 
            />
            
            {/* User Management - แสดงสำหรับ Admin และ Developer เท่านั้น */}
            {(isAdmin || isDeveloper) && (
              <NavLink 
                href="/admin/users" 
                active={isActive('/admin/users')} 
                icon={<FiUsers />} 
                text="User Management" 
              />
            )}
            
            {/* Database Management - แสดงเฉพาะกับ Developer เท่านั้น */}
            {isDeveloper && (
              <NavLink 
                href="/admin/dev-tools" 
                active={isActive('/admin/dev-tools')} 
                icon={<FiServer />} 
                text="Dev-Tools" 
              />
            )}
          </div>
          
          {/* User Info and Login/Logout - Desktop */}
          <div className="hidden md:flex md:items-center">
            {renderAuthButton()}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="p-3 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none bg-white dark:bg-gray-800 shadow-md"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <FiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg">
          {/* Mobile Menu Links */}
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Form - ทุก Role สามารถเห็นได้ */}
            <MobileNavLink 
              href="/census/form" 
              active={isActive('/census/form')} 
              icon={<FiClipboard />} 
              text={isAdmin ? "WardForm" : "Form"} 
              onClick={() => setIsMenuOpen(false)} 
            />
            
            {/* Approval - ทุก Role สามารถเห็นได้ */}
            <MobileNavLink 
              href="/census/approval" 
              active={isActive('/census/approval')} 
              icon={<FiCheckSquare />} 
              text="Approval" 
              onClick={() => setIsMenuOpen(false)} 
            />
            
            {/* Dashboard - ทุก Role สามารถเห็นได้ */}
            <MobileNavLink 
              href="/features/dashboard" 
              active={isActive('/features/dashboard')} 
              icon={<FiPieChart />} 
              text="Dashboard" 
              onClick={() => setIsMenuOpen(false)} 
            />
            
            {/* User Management - แสดงสำหรับ Admin และ Developer เท่านั้น */}
            {(isAdmin || isDeveloper) && (
              <MobileNavLink 
                href="/admin/users" 
                active={isActive('/admin/users')} 
                icon={<FiUsers />} 
                text="User Management" 
                onClick={() => setIsMenuOpen(false)} 
              />
            )}
            
            {/* Database Management - แสดงเฉพาะกับ Developer เท่านั้น */}
            {isDeveloper && (
              <MobileNavLink 
                href="/admin/dev-tools"
                active={isActive('/admin/dev-tools')}
                icon={<FiServer />} 
                text="Dev-Tools"
                onClick={toggleMenu}
              />
            )}
          </div>
          
          {/* User section or login button */}
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            {renderMobileAuthButton()}
          </div>
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
      className={`flex items-center py-2 px-3 rounded-md transition-colors text-nav font-medium ${
        active 
          ? 'bg-blue-600 dark:bg-blue-700 text-white' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white'
      }`}
    >
      <span className="mr-2">{icon}</span>
      <span>{text}</span>
    </Link>
  );
};

// Helper component for mobile nav links
const MobileNavLink = ({ href, active, icon, text, onClick }: { href: string; active: boolean; icon: React.ReactNode; text: string; onClick?: () => void }) => {
  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
        active
          ? 'bg-blue-600 dark:bg-blue-700 text-white'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="mr-3 h-5 w-5">{icon}</span>
      <span>{text}</span>
    </Link>
  );
};

export default NavBar;