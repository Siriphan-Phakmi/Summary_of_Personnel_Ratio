'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';

export default function AuthGuard({ children, requiredRole = null }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [initialRender, setInitialRender] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // ตั้งค่า initialRender เป็น false เมื่อ component ถูกเรียกใช้
    setInitialRender(false);
    
    try {
      // ตรวจสอบการเข้าสู่ระบบเมื่อโหลดเสร็จสิ้น
      if (!loading) {
        console.log('AuthGuard checking auth:', { isAuthenticated, user, requiredRole });
        
        if (!isAuthenticated) {
          // ไม่ได้เข้าสู่ระบบ - เปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ
          console.log('Not authenticated, redirecting to login');
          router.push('/login');
        } else if (requiredRole && user && user.role !== requiredRole) {
          // ผู้ใช้ไม่มีสิทธิ์ที่จำเป็น - แสดงข้อความแทนการเปลี่ยนเส้นทาง
          console.log('User does not have required role:', { role: user.role, requiredRole });
          setAccessDenied(true);
          setAuthorized(false);
        } else {
          // เข้าสู่ระบบและมีสิทธิ์
          console.log('User is authenticated and authorized');
          setAuthorized(true);
          setAccessDenied(false);
        }
      }
    } catch (error) {
      console.error('Error in AuthGuard:', error);
      setAuthorized(false);
    }
  }, [loading, isAuthenticated, user, router, requiredRole]);

  // ข้ามการแสดงผล LoadingScreen ใน Server-Side Rendering
  if (typeof window === 'undefined' || initialRender) {
    // คืนค่าเนื้อหาขั้นต่ำระหว่าง SSR เพื่อป้องกัน hydration mismatch
    return <div className="min-h-screen"></div>;
  }

  // แสดงข้อความปฏิเสธสิทธิ์เมื่อผู้ใช้ไม่มีสิทธิ์เข้าถึง
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600 mb-6">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เนื่องจากต้องมีบทบาทเป็น {requiredRole}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#0ab4ab] text-white rounded-md hover:bg-[#0ab4ab]/90"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // แสดง LoadingScreen ในขณะที่ตรวจสอบการเข้าสู่ระบบในฝั่ง client
  if (loading || !authorized) {
    console.log('Still loading or not authorized yet, showing LoadingScreen');
    return <LoadingScreen />;
  }

  // แสดงเนื้อหาเมื่อเข้าสู่ระบบและมีสิทธิ์
  console.log('Rendering children - user authorized');
  return <>{children}</>;
}
