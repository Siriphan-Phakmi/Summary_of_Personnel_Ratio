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
    // Set initial render to false after component mounts
    setInitialRender(false);
    
    // Check authentication
    if (!loading) {
      if (!isAuthenticated) {
        // Not logged in - redirect to login
        router.push('/login');
      } else if (requiredRole && user && user.role !== requiredRole) {
        // User doesn't have required role - แสดงข้อความแทนการ redirect
        setAccessDenied(true);
        setAuthorized(false);
      } else if (isAuthenticated) {
        // Authenticated and authorized
        setAuthorized(true);
        setAccessDenied(false);
      }
    }
  }, [loading, isAuthenticated, user, router, requiredRole]);

  // Skip server-side rendering of LoadingScreen by checking if this is initial render
  if (typeof window === 'undefined' || initialRender) {
    // Return minimal content during SSR to prevent hydration mismatch
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

  // Show loading screen while checking auth in client-side
  if (loading || !authorized) {
    return <LoadingScreen />;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
}
