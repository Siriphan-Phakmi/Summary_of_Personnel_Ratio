'use client';

import React, { Suspense } from 'react';
import LoginPage from '@/app/features/auth/LoginPage';
import { useSearchParams } from 'next/navigation';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>กำลังโหลด...</div>}>
      <LoginPage />
    </Suspense>
  );
}
