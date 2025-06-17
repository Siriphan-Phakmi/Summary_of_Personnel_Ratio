'use client';

import React from 'react';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';

// นี่คือคอมโพเนนต์หลักของหน้า User Management (จะสร้างจริงในขั้นตอนต่อไป)
const UserManagementComponent = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <p className="text-center">
          ส่วนประกอบของหน้า User Management (ฟอร์มสร้างผู้ใช้, ตารางแสดงรายชื่อ) จะถูกสร้างขึ้นที่นี่
        </p>
      </div>
    </div>
  );
};

// นี่คือ Page Wrapper สำหรับ Route
const UserManagementPage = () => {
  return (
    <AuthProvider>
      <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.DEVELOPER]}>
        <UserManagementComponent />
      </ProtectedPage>
    </AuthProvider>
  );
};

export default UserManagementPage; 