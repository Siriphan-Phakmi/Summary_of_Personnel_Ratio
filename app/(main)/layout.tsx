'use client';

import React from 'react';
import { AuthProvider } from '@/app/features/auth';
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
      <AuthProvider>
        <NotificationProvider>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-grow p-4 sm:p-6 md:p-8">
              {children}
            </main>
          </div>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
