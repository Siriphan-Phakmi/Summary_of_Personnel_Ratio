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

const LoginContent = () => {
  const searchParams = useSearchParams();
  // ...logic อื่นๆ
  return (
    <Suspense fallback={<div>กำลังโหลด...</div>}>
      <LoginForm />
    </Suspense>
  );
}

const LoginForm = () => {
  const searchParams = useSearchParams();
  // ...logic อื่นๆ
  return <div>ฟอร์มล็อกอิน</div>;
}
