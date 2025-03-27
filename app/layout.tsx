import { Metadata } from 'next';
import './globals.css';
import './styles/fonts.css';
import ThemeProvider from './contexts/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import { Toaster } from 'react-hot-toast';

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
      <body className="relative min-h-screen font-sarabun">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
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
