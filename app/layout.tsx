import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import './globals.css';
import ThemeProvider from '@/app/features/theme/ThemeProvider';
import { AuthProvider } from '@/app/features/auth/AuthContext';
import { Toaster } from 'react-hot-toast';

// Configure metadata
export const metadata: Metadata = {
  title: 'BPK9 Daily Patient Census and Staffing',
  description: 'Personnel ratio management system for BPK9 International Hospital',
  authors: [{ name: 'BPK9 IT Department' }],
};

// Explicitly define viewport
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/bpk9.ico" sizes="any" />
      </head>
      <body className="relative min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster 
              position="top-right"
              gutter={16}
              reverseOrder={true}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toaster-bg)',
                  color: 'var(--toaster-fg)',
                  border: '1px solid var(--toaster-border)',
                  fontSize: '1.15rem',
                  padding: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  maxWidth: '380px'
                },
                success: {
                  style: {
                    background: 'var(--toaster-bg)',
                    border: '1px solid var(--button-bg-primary)',
                  },
                  icon: '✓',
                  className: 'animate-slide-right-enter animate-slide-right-leave',
                },
                error: {
                  style: {
                    background: 'var(--toaster-bg)',
                    border: '1px solid var(--button-bg-danger)',
                  },
                  icon: '✕',
                  duration: 5000,
                  className: 'animate-slide-right-enter animate-slide-right-leave',
                }
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
