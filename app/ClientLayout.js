'use client';

import { Providers } from './context/Providers';
import { useEffect, useState } from 'react';
import Navbar from './components/common/Navbar';
import { AlertProvider } from './utils/alertService';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import FirebaseIndexValidator from './components/FirebaseIndexValidator';

export default function ClientLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // เช็คว่าเป็นหน้า login หรือไม่
  const isLoginPage = pathname === '/page/login' || pathname === '/login';

  useEffect(() => {
    setMounted(true);
    console.log('ClientLayout mounted - setting up providers');
    // ตรวจสอบว่า AlertProvider ถูกโหลดอย่างถูกต้อง
    if (typeof AlertProvider !== 'function') {
      console.error('AlertProvider is not a valid component:', AlertProvider);
    } else {
      console.log('AlertProvider loaded correctly');
    }
    
    // ตรวจสอบว่า Providers ถูกโหลดอย่างถูกต้อง
    if (typeof Providers !== 'function') {
      console.error('Providers is not a valid component:', Providers);
    } else {
      console.log('Providers loaded correctly');
    }
  }, []);

  // ป้องกัน hydration mismatch โดยรอให้ client-side เรนเดอร์ก่อน
  if (!mounted) {
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  return (
    <AlertProvider>
      <AuthProvider>
        <ThemeProvider>
          <FirebaseIndexValidator />
          <Providers>
            {/* แสดง Navbar เฉพาะเมื่อไม่ใช่หน้า login */}
            {!isLoginPage && <Navbar />}
            <div className={!isLoginPage ? "pt-8" : ""}>
              {children}
            </div>
          </Providers>
        </ThemeProvider>
      </AuthProvider>
    </AlertProvider>
  );
} 