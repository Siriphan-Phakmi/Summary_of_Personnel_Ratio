import { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/app/features/theme';
import { AuthProvider } from '@/app/features/auth';
import { Toaster } from 'react-hot-toast';
import { ThemeToggle } from '@/app/core/ui';

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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/bpk9.ico" sizes="any" />
      </head>
      <body className="relative min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <div className="fixed bottom-4 right-4 z-50">
              <ThemeToggle />
            </div>
            {children}
            <Toaster 
              position="top-right"
              gutter={16}
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'var(--toaster-bg)',
                  color: 'var(--toaster-fg)',
                  border: '1px solid var(--toaster-border)',
                  fontSize: '1.15rem',
                  padding: '16px'
                },
                success: {
                  style: {
                    background: 'var(--toaster-bg)',
                    border: '1px solid var(--button-bg-primary)',
                  },
                },
                error: {
                  style: {
                    background: 'var(--toaster-bg)',
                    border: '1px solid var(--button-bg-danger)',
                  },
                }
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
