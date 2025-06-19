'use client';

import React from 'react';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { UserRole } from '@/app/features/auth/types/user';
import CreateUserForm from '@/app/features/admin/components/CreateUserForm';

// นี่คือคอมโพเนนต์หลักของหน้า User Management
const UserManagementComponent = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          User Management
        </h1>
        <p className="mt-1 text-md text-gray-600 dark:text-gray-400">
          Create, view, and manage user accounts in the system.
        </p>
      </header>

      <div className="space-y-8">
        <CreateUserForm />
        
        <div className="bg-gray-100 dark:bg-gray-800/50 p-8 rounded-lg shadow-inner text-center mt-8">
            <p className="text-gray-500 dark:text-gray-400">User list and editing features will be displayed here in the future.</p>
        </div>
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