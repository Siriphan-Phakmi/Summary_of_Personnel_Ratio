'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // ป้องกัน redirect loop โดยทำงานเมื่อโหลด auth state เสร็จเท่านั้น
    if (!isLoading) {
      if (user) {
        // ถ้าล็อกอินแล้ว ไปที่หน้า home ซึ่งจะมีตัวเลือกนำทาง
        router.push('/home');
      } else {
        // ถ้ายังไม่ล็อกอิน ไปที่หน้า login
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // แสดงหน้าโหลดระหว่างตรวจสอบสถานะ
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 