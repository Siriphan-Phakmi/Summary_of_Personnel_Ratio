'use client';

import React from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { UserRole } from '@/app/core/types/user';

export default function UserManagementPage() {
  return (
    <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DEVELOPER]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            👥 User Management
          </h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              🚧 Under Development
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This feature is currently under development. Please check back later.
            </p>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-800 dark:text-blue-300">Planned Features</h3>
              <ul className="mt-2 text-blue-600 dark:text-blue-400 space-y-1">
                <li>• User account management</li>
                <li>• Role assignment</li>
                <li>• Permission management</li>
                <li>• User activity monitoring</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 