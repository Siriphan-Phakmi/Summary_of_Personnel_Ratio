'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AuthGuard from '../auth/AuthGuard';
import LoadingScreen from '../ui/LoadingScreen';
import { APP_VERSION } from '../../config/version';
import { logEvent } from '../../utils/clientLogging';

/**
 * PageLayout component
 * 
 * A shared layout component for all pages. Handles:
 * - Authentication check
 * - Role-based access control
 * - Loading states
 * - Common UI elements (headers, footers, etc.)
 * 
 * @param {ReactNode} children - The content to render inside the layout
 * @param {string} title - The title of the page
 * @param {string} requiredRole - The role required to access the page (default: "user")
 * @param {ReactNode} infoBox - Optional information box to display at the top of the page
 */
export default function PageLayout({ 
  children, 
  title,
  requiredRole = "user",
  infoBox 
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    
    // Check role-based access
    if (user && user.role) {
      // Admin has access to everything
      if (user.role.toLowerCase() === "admin") {
        setHasAccess(true);
      }
      // Special case: "user" role is the base role, everyone has access
      else if (requiredRole === "user") {
        setHasAccess(true);
      } 
      // Otherwise, check if user has the required role
      else if (user.role.toLowerCase() === requiredRole.toLowerCase()) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
        logEvent('unauthorized_access_attempt', {
          userRole: user.role,
          requiredRole: requiredRole,
          page: title
        });
      }
    }
  }, [loading, isAuthenticated, router, user, requiredRole, title]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }
  
  if (!hasAccess) {
    // User is authenticated but doesn't have the required role
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">ไม่มีสิทธิ์เข้าถึง</h3>
            <p className="mt-1 text-sm text-gray-500">
              คุณไม่มีสิทธิ์เพียงพอในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบหากคุณเชื่อว่านี่เป็นข้อผิดพลาด
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => router.push('/')}
              >
                กลับไปยังหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole={requiredRole}>
      <div className="min-h-screen pb-16 relative">
        <main className="container mx-auto px-4 pt-20">
          {title && (
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">{title}</h1>
          )}
          
          {infoBox && (
            <div className="mb-6">
              {infoBox}
            </div>
          )}
          
          {children}
        </main>

        {/* App version display */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {APP_VERSION}
        </div>
      </div>
    </AuthGuard>
  );
} 