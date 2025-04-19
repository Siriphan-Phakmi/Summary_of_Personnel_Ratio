'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import { logPageAccess } from '@/app/features/auth/services/logService';
import { usePathname } from 'next/navigation';

interface ProtectedPageProps {
  children: ReactNode;
  requiredRole?: string | string[]; // กำหนด role ที่ต้องการ (ถ้ามี)
}

/**
 * แสดง log เฉพาะในโหมด development
 * @param message ข้อความที่ต้องการแสดง
 */
function devLog(message: string): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[PROTECTED] ${message}`); // Changed prefix for clarity
  }
}

/**
 * คอมโพเนนต์สำหรับป้องกันหน้าที่ต้องการการล็อกอิน
 * จะตรวจสอบว่ามีการล็อกอินแล้วหรือไม่ และตรวจสอบ role ถ้ากำหนด
 * ถ้าไม่ได้ล็อกอิน จะ redirect ไปยังหน้า login
 * ถ้า role ไม่ตรงกับที่กำหนด จะแสดงข้อความแจ้งเตือน
 */
export default function ProtectedPage({ children, requiredRole }: ProtectedPageProps) {
  const { user, authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle Authentication Status Changes and Redirection
  useEffect(() => {
    if (!isMounted) return; // Wait until mounted

    devLog(`Effect triggered. Path: ${pathname}, AuthStatus: ${authStatus}, User: ${user?.username ?? 'null'}`);

    if (authStatus === 'unauthenticated') {
      devLog('Auth status is unauthenticated, redirecting to login...');
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      if (!user) {
        devLog('Authenticated status but no user! Redirecting to login.');
        router.push('/login');
        return; // Stop further checks
      }
      // Check roles if requiredRole is specified
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        devLog(`Checking role. User role: ${user.role}, Required: ${roles.join(', ')}`);
        if (!roles.includes(user.role)) {
          devLog('Role mismatch, redirecting to home...');
          router.push('/home');
          return; // Stop further checks
        }
      }
      // Role check passed or not required, log access
      devLog(`Access granted check passed for ${user.username} at ${pathname}`);
      if (pathname) {
          logPageAccess(user, pathname).catch(err => {
            console.error('Failed to log page access:', err);
          });
      }
    }
    // If 'loading', do nothing in this effect, wait for status change

  }, [authStatus, user, router, requiredRole, isMounted, pathname]);

  // Conditional Rendering Logic
  if (!isMounted || authStatus === 'loading') {
    // Show loading spinner if not mounted yet or auth is loading
    devLog('Rendering Loading Spinner (isMounted=' + isMounted + ', authStatus=' + authStatus + ')');
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (authStatus === 'authenticated') {
    // Double-check role before rendering children, only if authenticated
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!user || !roles.includes(user.role)) {
           devLog('Final render check: Role mismatch. Rendering null.');
           return null; // Render nothing if role mismatch detected just before render
        }
    }
    devLog('Rendering Children (authenticated and authorized)');
    return <>{children}</>; // Render children if authenticated and authorized
  }

  // If unauthenticated, useEffect handles redirect, render null in the meantime
  devLog('Rendering null (unauthenticated or redirecting)');
  return null; 
} 