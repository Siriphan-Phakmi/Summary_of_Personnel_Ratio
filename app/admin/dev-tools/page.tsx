'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { UserRole } from '@/app/core/types/user';
import LogViewer from '@/app/features/admin/LogViewer';

export default function DevToolsPage() {
  return (
    <ProtectedPage requiredRole={[UserRole.DEVELOPER, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            🛠️ Developer Tools
          </h1>
          
          <div className="grid gap-6">
            {/* Log Viewer Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                📋 System Logs
              </h2>
              <LogViewer />
            </div>
            
            {/* System Status Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                🔍 System Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-medium text-green-800 dark:text-green-300">Firebase</h3>
                  <p className="text-green-600 dark:text-green-400">Connected</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">Authentication</h3>
                  <p className="text-blue-600 dark:text-blue-400">Active</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-medium text-purple-800 dark:text-purple-300">Database</h3>
                  <p className="text-purple-600 dark:text-purple-400">Operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 