'use client';

import React from 'react';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';
import LogViewer from '@/app/features/admin/LogViewer';
import { CollectionCleanupPanel } from '@/app/features/admin/components/CollectionCleanupPanel';

export default function DevToolsPage() {
  return (
    <ProtectedPage requiredRole={UserRole.DEVELOPER}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-6">
        <div className="container mx-auto p-4 space-y-6">
          {/* Main Page Header */}
          <header>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              🛠️ Developer Tools
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Advanced debugging and testing tools for system administrators.
            </p>
          </header>

          {/* Collection Cleanup Section */}
          <div className="flex flex-col gap-4">
            <header>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                🧹 Database Cleanup (Lean Code)
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                จัดการและทำความสะอาด Firebase Collections ที่ไม่ได้ใช้งาน
              </p>
            </header>
            <CollectionCleanupPanel />
          </div>

          {/* Log Viewer Section */}
          <div className="flex flex-col gap-4">
            <header>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                📋 บันทึกการทำงานของระบบ (System Logs)
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ตรวจสอบและจัดการบันทึกกิจกรรมต่างๆ ที่เกิดขึ้นในระบบ
              </p>
            </header>
            <LogViewer className="mt-4" />
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 