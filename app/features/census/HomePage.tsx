'use client';

import React from 'react';
import { useAuth } from '@/app/features/auth/AuthContext';
import Button from '@/app/core/ui/Button';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
        Login Successful!
      </h1>
      {user && (
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          Welcome, {user.firstName || user.username || 'User'}!
        </p>
      )}
      <Button onClick={logout} variant="secondary">
        Logout
      </Button>
    </div>
  );
}