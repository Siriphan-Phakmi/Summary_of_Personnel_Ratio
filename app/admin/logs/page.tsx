'use client';

import React from 'react';
import LogViewer from '@/app/features/admin/LogViewer';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function LogsPage() {
  return (
    <ProtectedPage requiredRole="admin">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">บันทึกการทำงานของระบบ</h1>
        <LogViewer />
      </div>
    </ProtectedPage>
  );
} 