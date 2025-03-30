'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function UserManagementPage() {
  return (
    <ProtectedPage requiredRole="admin">
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">จัดการผู้ใช้งานระบบ</h1>
          {/* เนื้อหาหน้าจัดการผู้ใช้จะถูกเพิ่มภายหลัง */}
        </div>
      </div>
    </ProtectedPage>
  );
}
