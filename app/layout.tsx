import './globals.css';
import './styles/fonts.css';
import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/app/contexts/AuthContext';
import ThemeProvider from '@/app/contexts/ThemeProvider';
import { LanguageProvider } from '@/app/contexts/LanguageContext';
import Navbar from '@/app/components/Navbar';
import Loading from '@/app/components/ui/Loading';
import ThemeToggle from '@/app/components/ui/ThemeToggle';
import LanguageToggle from '@/app/components/LanguageToggle';

export const metadata = {
  title: 'BPK-9 Personnel Ratio System',
  description: 'Summary of Personnel Ratio System for BPK-9',
  icons: {
    icon: '/bpk9.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <title>BPK Personnel Ratio</title>
        <meta name="description" content="Personnel Ratio Management System for BPK Hospital" />
        <link rel="icon" href="/bpk9.ico" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sarabun">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <div className="min-h-screen">
                <Navbar />
                <main className="pt-20 pb-10 px-4 mx-auto max-w-7xl">
                  <Suspense fallback={<Loading />}>
                    {children}
                  </Suspense>
                </main>
                <div className="fixed bottom-6 right-6 z-50 flex flex-row space-x-4 items-center">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </div>
              <Toaster position="top-right" />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
