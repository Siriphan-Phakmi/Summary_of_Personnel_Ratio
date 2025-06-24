'use client';

import React from 'react';
import LoginPage from '@/app/features/auth/LoginPage';
import { Suspense } from 'react';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-gray-700 dark:text-gray-300">กำลังโหลด...</p>
      </div>
    </div>}>
      <LoginPage />
    </Suspense>
  );
}
