'use client';

import { Providers } from './context/Providers';
import { useEffect, useState } from 'react';
import Navbar from './components/common/Navbar';

export default function ClientLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setMounted(true);
      console.log('ClientLayout mounted - setting up providers');
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

  // Wrap the Providers with error boundary
  try {
    return (
      <Providers>
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
      </Providers>
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