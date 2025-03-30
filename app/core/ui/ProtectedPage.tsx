'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

interface ProtectedPageProps {
  children: ReactNode;
  requiredRole?: string | string[]; // กำหนด role ที่ต้องการ (ถ้ามี)
}

/**
 * คอมโพเนนต์สำหรับป้องกันหน้าที่ต้องการการล็อกอิน
 * จะตรวจสอบว่ามีการล็อกอินแล้วหรือไม่ และตรวจสอบ role ถ้ากำหนด
 * ถ้าไม่ได้ล็อกอิน จะ redirect ไปยังหน้า login
 * ถ้า role ไม่ตรงกับที่กำหนด จะแสดงข้อความแจ้งเตือน
 */
export default function ProtectedPage({ children, requiredRole }: ProtectedPageProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  // เพิ่ม state เพื่อป้องกัน hydration error
  const [isMounted, setIsMounted] = useState(false);
  // เพิ่ม state เพื่อตรวจสอบสถานะการเข้าถึง
  const [accessStatus, setAccessStatus] = useState<'checking' | 'no-user' | 'no-permission' | 'granted'>('checking');

  // ตั้งค่า isMounted เป็น true หลังจาก component mount ที่ client แล้ว
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ทำการตรวจสอบสิทธิ์การเข้าถึงหลังจาก component mount ที่ client แล้วเท่านั้น
  useEffect(() => {
    // ทำงานเฉพาะเมื่อ mounted บน client แล้วเท่านั้น
    if (isMounted && !isLoading) {
      // ถ้าไม่มีข้อมูลผู้ใช้ (ไม่ได้ล็อกอิน)
      if (!user) {
        console.log('User not logged in, redirecting to login page');
        setAccessStatus('no-user');
        router.push('/login');
        return;
      }

      // ถ้ากำหนด role แต่ผู้ใช้ไม่มีสิทธิ์ที่ต้องการ
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        if (!roles.includes(user.role)) {
          console.log(`User role ${user.role} does not match required roles: ${roles.join(', ')}`);
          setAccessStatus('no-permission');
          router.push('/home'); // ถ้าไม่มีสิทธิ์ ย้อนกลับไปหน้าหลัก
          return;
        }
      }
      
      // หากผ่านการตรวจสอบทั้งหมด
      setAccessStatus('granted');
    }
  }, [user, isLoading, router, requiredRole, isMounted]);

  // กรณีกำลังโหลดหรือยังไม่ mount บน client
  // สำหรับ server-side rendering ต้องแสดงเนื้อหาเหมือนหลังจาก mount บน client
  if (isLoading || !isMounted) {
    // ทำ SSR ให้ตรงกับ client side เพื่อป้องกัน hydration error
    return <>{children}</>;
  }

  // ตรวจสอบสถานะการเข้าถึงและแสดงผลตามนั้น
  switch (accessStatus) {
    case 'no-user':
    case 'no-permission':
      // แสดง loading spinner ระหว่างรอ redirect
      return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    
    case 'granted':
      // แสดงเนื้อหาหน้าเมื่อตรวจสอบสิทธิ์แล้ว
      return <>{children}</>;
    
    default:
      // กำลังตรวจสอบ
      return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
  }
} 