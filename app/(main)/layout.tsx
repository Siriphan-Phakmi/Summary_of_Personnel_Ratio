'use client';

import React from 'react';
// ✅ ลบ AuthProvider ออก - ใช้จาก root layout แล้ว
import NavBar from '@/app/components/ui/NavBar';
import { ThemeProvider } from '@/app/features/theme';
import { NotificationProvider } from '@/app/features/notifications/contexts/NotificationContext';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {/* ✅ ไม่ต้องใช้ AuthProvider ซ้ำ - มีใน root layout แล้ว */}
      <NotificationProvider>
        <div className="flex flex-col min-h-screen">
          <NavBar />
          <main className="flex-grow p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </NotificationProvider>
    </ThemeProvider>
  );
}
