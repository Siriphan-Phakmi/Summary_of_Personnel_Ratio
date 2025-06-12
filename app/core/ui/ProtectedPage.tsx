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

// ฟังก์ชันหา redirect path ตาม role
const getDefaultRedirectPath = (userRole?: string): string => {
  switch (userRole) {
    case 'admin':
    case 'super_admin':
    case 'developer':
    case 'approver':
      return '/census/approval';
    case 'nurse':
    case 'ward_clerk':
      return '/census/form';
    default:
      return '/features/dashboard';
  }
};

const ProtectedPage: React.FC<ProtectedPageProps> = ({
  children,
  requiredRole,
  message = 'คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้',
  redirectUrl = '/login',
}) => {
  const { user, authStatus, checkRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ตรวจสอบการล็อกอิน
    if (authStatus === 'unauthenticated') {
      showErrorToast('กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน');
      router.push(redirectUrl);
      return;
    }

    // ตรวจสอบสิทธิ์หากมีการระบุ requiredRole
    if (authStatus === 'authenticated' && requiredRole) {
      const hasPermission = checkRole(requiredRole);
      
      if (!hasPermission) {
        console.warn(`User ${user?.username} (${user?.role}) attempted to access page requiring role(s): ${Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}`);
        showErrorToast(message);
        
        // Redirect ตาม role ของผู้ใช้
        const defaultPath = getDefaultRedirectPath(user?.role);
        router.push(defaultPath);
      }
    }
  }, [user, authStatus, requiredRole, message, redirectUrl, router, checkRole]);

  // แสดงหน้าเปล่าระหว่างการตรวจสอบการเข้าสู่ระบบ
  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // หากยังไม่ได้ล็อกอิน
  if (authStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500 text-3xl mb-4">🔒</div>
        <h1 className="text-xl font-medium text-center mb-2 text-gray-900 dark:text-white">ต้องเข้าสู่ระบบ</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">กำลังเปลี่ยนเส้นทางไปหน้าล็อกอิน...</p>
      </div>
    );
  }

  // ตรวจสอบสิทธิ์ก่อนแสดงเนื้อหา
  if (requiredRole && !checkRole(requiredRole)) {
    const defaultPath = getDefaultRedirectPath(user?.role);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500 text-3xl mb-4">⚠️</div>
        <h1 className="text-xl font-medium text-center mb-2 text-gray-900 dark:text-white">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-2">{message}</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 text-center mb-4">
          Role ของคุณ: <span className="font-medium">{user?.role}</span>
        </p>
        <button
          onClick={() => router.push(defaultPath)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          กลับสู่หน้าที่เหมาะสม
        </button>
      </div>
    );
  }

  // ผู้ใช้มีสิทธิ์ - แสดงเนื้อหา
  return <>{children}</>;
};

export default ProtectedPage; 