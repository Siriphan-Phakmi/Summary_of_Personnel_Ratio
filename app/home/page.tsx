'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

// This page acts as a redirect handler for the /home route
export default function HomeRedirectPage() {
  const { user, authStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to load
    if (authStatus !== 'loading') {
      if (user && authStatus === 'authenticated') {
        // ป้องกัน redirect loop - ใช้ replace แทน push และตรวจสอบ pathname
        const targetPath = (user.role === 'admin' || user.role === 'developer') 
          ? '/census/approval' 
          : '/census/form';
        
        // ใช้ replace เพื่อไม่ให้มีประวัติการ navigate ไว้ใน history
        router.replace(targetPath);
      } else if (authStatus === 'unauthenticated') {
        // Not logged in, redirect to login
        router.replace('/login');
      }
    }
  }, [user, authStatus, router]);

  // Display a loading indicator while redirecting or loading
  if (authStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Return null or the loading indicator while redirect is happening after loading
  return null; 
} 