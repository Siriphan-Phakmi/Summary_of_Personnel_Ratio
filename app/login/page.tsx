'use client';

import dynamic from 'next/dynamic';

// ใช้ dynamic import แบบ client-side only
const LoginPage = dynamic(
  () => import('@/app/features/auth').then(mod => mod.LoginPage),
  { ssr: false }
);

export default function LoginPageWrapper() {
  return <LoginPage />;
}
