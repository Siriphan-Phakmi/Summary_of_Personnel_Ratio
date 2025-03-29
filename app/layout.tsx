import { Metadata } from 'next';
import './globals.css';
import './styles/fonts.css';
import { ThemeProvider } from '@/app/features/theme';
import { AuthProvider } from '@/app/features/auth';
import { Toaster } from 'react-hot-toast';
import { ThemeToggle } from '@/app/core/ui';

// Configure metadata
export const metadata: Metadata = {
  title: 'BPK9 Personnel Ratio System',
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
      <body className="relative min-h-screen font-sarabun bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: 'var(--background, #ffffff)',
                  color: 'var(--foreground, #000000)',
                  border: '1px solid var(--border, #e5e7eb)',
                  fontSize: '1.15rem'
                }
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
