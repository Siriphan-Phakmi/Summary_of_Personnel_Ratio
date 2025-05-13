'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

export default function RootPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();

  useEffect(() => {
    // Wait for auth state to be determined
    if (authStatus !== 'loading') {
      if (user && authStatus === 'authenticated') {
        // ป้องกัน redirect loop โดยใช้ replace และ redirect ไปที่ target path โดยตรง
        let targetPath;
        
        if (user.role === 'admin' || user.role === 'developer' || user.role === 'super_admin') {
          // สำหรับ admin/developer นำทางไปที่ dashboard เพื่อดูภาพรวม
          targetPath = '/features/dashboard';
        } else {
          // สำหรับผู้ใช้ทั่วไปไปที่หน้ากรอกฟอร์ม
          targetPath = '/census/form';
        }
        
        // ใช้ replace เพื่อไม่ให้มีประวัติการ navigate ไว้ใน history
        router.replace(targetPath);
      } else if (authStatus === 'unauthenticated') {
        // If not logged in, go to the login page
        router.replace('/login');
      }
    }
  }, [user, authStatus, router]);

  // Display loading indicator while checking auth status
  if (authStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Return null while redirecting after loading
  return null;
} 