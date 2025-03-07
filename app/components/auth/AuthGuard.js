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
    setInitialRender(false);
    
    try {
      if (!loading) {
        console.log('AuthGuard checking auth:', { isAuthenticated, user, requiredRole });
        
        if (!isAuthenticated) {
          console.log('Not authenticated, redirecting to login');
          router.push('/login');
        } else if (requiredRole === 'admin' && user?.role?.toLowerCase() !== 'admin') {
          // เฉพาะ admin role เท่านั้นจะได้เข้าถึง
          console.log('User does not have admin role');
          setAccessDenied(true);
          setAuthorized(false);
        } else {
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
    // ค่าเนื้อหาต่ำระหว่าง SSR เล่อป้อง hydration mismatch
    return <div className="min-h-screen"></div>;
  }

  // แสดงข้อความเสธ์เมื่อใช้ไม่ได้เข้า
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">ไม่ได้เข้า</h1>
          <p className="text-gray-600 mb-6">
            ไม่ได้เข้าหน้านี้ เนื่องจากต้องมีบทบาทเป็น {requiredRole}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#0ab4ab] text-white rounded-md hover:bg-[#0ab4ab]/90"
          >
            หน้าแรก
          </button>
        </div>
      </div>
    );
  }

  // แสดง LoadingScreen ในขณะตรวจสอบการเข้าระบบใน่ง client
  if (loading || !authorized) {
    console.log('Still loading or not authorized yet, showing LoadingScreen');
    return <LoadingScreen />;
  }

  // แสดงเนื้อหาเมื่อเข้าระบบได้
  console.log('Rendering children - user authorized');
  return <>{children}</>;
}
