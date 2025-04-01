'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8 dashboard-page">
          <h1 className="text-2xl font-bold mb-6">รายงานและแดชบอร์ด</h1>
          {/* เนื้อหาหน้าแดชบอร์ดจะถูกเพิ่มภายหลัง */}
        </div>
      </div>
    </ProtectedPage>
  );
} 