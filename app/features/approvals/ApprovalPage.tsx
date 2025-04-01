'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function ApprovalPage() {
  return (
    <ProtectedPage requiredRole={['admin', 'supervisor']}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container p-4 mx-auto approval-page">
          <h1 className="text-2xl font-bold mb-6">การอนุมัติแบบฟอร์ม</h1>
        </div>
      </div>
    </ProtectedPage>
  );
} 