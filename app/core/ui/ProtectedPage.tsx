'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth/AuthContext';
import { UserRole } from '@/app/core/types/user';
import { showErrorToast } from '@/app/core/utils/toastUtils';

interface ProtectedPageProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  message?: string;
  redirectUrl?: string;
}

const ProtectedPage: React.FC<ProtectedPageProps> = ({
  children,
  requiredRole,
  message = 'คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้',
  redirectUrl = '/login',
}) => {
  const { user, authStatus, checkRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      showErrorToast('กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน');
      router.push(redirectUrl);
      return;
    }

    // ตรวจสอบสิทธิ์หากมีการระบุ requiredRole
    if (authStatus === 'authenticated' && requiredRole && !checkRole(requiredRole)) {
      showErrorToast(message);
      router.push('/dashboard');
    }
  }, [user, authStatus, requiredRole, message, redirectUrl, router, checkRole]);

  // แสดงหน้าเปล่าระหว่างการตรวจสอบการเข้าสู่ระบบ
  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ตรวจสอบสิทธิ์ก่อนแสดงเนื้อหา
  if (requiredRole && !checkRole(requiredRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-3xl mb-4">⚠️</div>
        <h1 className="text-xl font-medium text-center mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{message}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  // ผู้ใช้มีสิทธิ์ - แสดงเนื้อหา
  return <>{children}</>;
};

export default ProtectedPage; 