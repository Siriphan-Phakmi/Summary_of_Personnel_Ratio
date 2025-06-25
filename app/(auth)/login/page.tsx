"use client";

import LoginPage from "@/app/features/auth/LoginPage";
import { Suspense } from 'react';

function LoginPageWrapper() {
  return <LoginPage />;
}

export default function SuspendedLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageWrapper />
    </Suspense>
  );
} 