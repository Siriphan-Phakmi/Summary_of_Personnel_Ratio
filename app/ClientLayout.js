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
  const [error, setError] = useState(null);
  const pathname = usePathname();
  
  // เช็คว่าเป็นหน้า login หรือไม่
  const isLoginPage = pathname === '/page/login' || pathname === '/login';

  useEffect(() => {
    try {
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
    } catch (err) {
      console.error('Error in ClientLayout mount:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดแอปพลิเคชัน');
    }
  }, []);

  // แสดงข้อความ error ถ้ามีปัญหา
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h2>
          <p className="mb-4">{error}</p>
          <p className="text-sm text-gray-600">กรุณารีเฟรชหน้าเว็บหรือติดต่อผู้ดูแลระบบ</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            รีเฟรชหน้า
          </button>
        </div>
      </div>
    );
  }

  // ป้องกัน hydration mismatch โดยรอให้ client-side เรนเดอร์ก่อน
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  // Wrap everything in try-catch to handle rendering errors
  try {
    return (
      <AlertProvider>
        <AuthProvider>
          <ThemeProvider>
            <FirebaseIndexValidator />
            <Providers>
              {/* แสดง Navbar เฉพาะเมื่อไม่ใช่หน้า login */}
              {!isLoginPage && <Navbar />}
              <div className={!isLoginPage ? "pt-16" : ""}>
                {children}
              </div>
            </Providers>
          </ThemeProvider>
        </AuthProvider>
      </AlertProvider>
    );
  } catch (err) {
    console.error('Error rendering ClientLayout:', err);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาดในการเรนเดอร์</h2>
          <p className="mb-4">{err.message || 'ไม่สามารถแสดงผลแอปพลิเคชันได้'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }
} 