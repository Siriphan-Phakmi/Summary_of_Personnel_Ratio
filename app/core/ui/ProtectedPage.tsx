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
    devLog('Component mounted.');
    setIsMounted(true);
  }, []);

  // Handle Authentication Status Changes and Redirection
  useEffect(() => {
    // Don't run checks until the component is mounted and auth status is determined
    if (!isMounted || authStatus === 'loading') {
        devLog(`Skipping checks. isMounted: ${isMounted}, authStatus: ${authStatus}`);
        return;
    }

    devLog(`Effect triggered. Path: ${pathname}, AuthStatus: ${authStatus}, User: ${user?.username ?? 'null'}`);

    if (authStatus === 'unauthenticated') {
      devLog('Auth status is unauthenticated, redirecting to login...');
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      if (!user) {
        // This case should ideally not happen if authStatus is 'authenticated'
        // But handle it defensively
        devLog('CRITICAL: Authenticated status but no user object! Redirecting to login.');
        router.push('/login');
        return; // Stop further checks
      }
      // Check roles if requiredRole is specified
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        devLog(`Checking role. User role: ${user.role}, Required: ${roles.join(', ')}`);
        if (!roles.includes(user.role)) {
          devLog('Role mismatch, user does not have required role. Redirecting to home...');
          // Redirect to a safe page like home or an unauthorized page
          // Avoid redirecting back to login if they ARE logged in but lack permissions
          router.push('/home');
          return; // Stop further checks
        }
        devLog('Role check passed.');
      } else {
         devLog('No specific role required for this page.');
      }
      // Role check passed or not required, log access
      devLog(`Access granted for ${user.username} at ${pathname}`);
      if (pathname) {
          logPageAccess(user, pathname).catch(err => {
            console.error('Failed to log page access:', err);
          });
      }
    }

  }, [authStatus, user, router, requiredRole, isMounted, pathname]);

  // Conditional Rendering Logic

  // 1. Show loading indicator while loading or not mounted
  if (!isMounted || authStatus === 'loading') {
    devLog('Rendering Loading Spinner (isMounted=' + isMounted + ', authStatus=' + authStatus + ')');
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 2. If authenticated AND authorized (role check passed in useEffect or no role required), render children
  if (authStatus === 'authenticated') {
    // Perform a final role check just before rendering, as an extra safeguard
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!user || !roles.includes(user.role)) {
           devLog('Final render check: Role mismatch detected just before render. Rendering null.');
           // Ideally, the redirect in useEffect should have already happened.
           // Returning null here prevents flashing the content incorrectly.
           return null;
        }
    }
    // If user exists and role check passes (or no role required), render children
    if (user) {
        devLog('Rendering Children (authenticated and authorized).');
        return <>{children}</>;
    } else {
        // This state should be extremely rare if authStatus === 'authenticated'
        devLog('Final render check: Authenticated but no user object. Rendering null.');
        return null;
    }
  }

  // 3. If unauthenticated, the useEffect should handle the redirect. Render null while that happens.
  // Also covers the case where authenticated but role check failed (redirect handled in useEffect).
  devLog('Rendering null (unauthenticated or unauthorized - redirect should be in progress).');
  return null;
} 