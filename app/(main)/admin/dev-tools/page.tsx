'use client';

import React from 'react';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';
import LogViewer from '@/app/features/admin/LogViewer';

export default function DevToolsPage() {
  return (
    <ProtectedPage requiredRole={UserRole.DEVELOPER}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center">
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

          {/* Log Viewer Component */}
          <LogViewer />
          
        </div>
      </div>
    </ProtectedPage>
  );
} 