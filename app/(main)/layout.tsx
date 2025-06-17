'use client';

import { AuthProvider } from '@/app/features/auth/AuthContext';
import NavBar from '@/app/components/ui/NavBar';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from '@/app/features/theme/ThemeProvider';
import { ReactNode } from 'react';

// This layout wraps pages that should have the main navigation bar.
export default function MainAppLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Toaster 
          position="top-right"
          gutter={16}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: 'green',
                secondary: 'white',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
} 