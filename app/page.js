'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftForm from './components/forms/ShiftForm';
import Dashboard from './components/dashboard/Dashboard';
import WardForm from './components/forms/WardForm';
import Navigation from './components/common/Navigation';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { PAGES } from './config/constants';
import { useAuth } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';
import debounce from 'lodash/debounce';

// APP_VERSION constant
const APP_VERSION = 'v.2.3.3.2025';

export default function Home() {
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(false);

  // ล้าง localStorage อัตโนมัติในโหมด development
  useEffect(() => {
    // ตรวจสอบว่าอยู่ในโหมด development และรันอยู่ในฝั่ง browser
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // ตรวจสอบว่ามีการเปิดแอพใหม่โดยใช้พารามิเตอร์จาก URL
      const clearCache = new URLSearchParams(window.location.search).get('clear_cache');
      
      if (clearCache === 'true') {
        console.log('Development mode: Clearing localStorage by URL parameter');
        localStorage.clear();
        // ลบพารามิเตอร์ clear_cache ออกจาก URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    console.log('Home page - Auth state:', { loading, isAuthenticated, user });
    
    try {
      if (!loading && !isAuthenticated) {
        console.log('Not authenticated, redirecting to login from Home');
        router.push('/login');
      } else if (!loading && isAuthenticated && user) {
        // นำทางตามสิทธิ์ของผู้ใช้
        if (user.role && user.role.toLowerCase() === 'user') {
          console.log('User role detected, redirecting to ward-form');
          router.push('/ward-form');
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err.message);
    }
  }, [loading, isAuthenticated, router, user]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  const renderContent = () => {
    if (loading) {
      console.log('Home - still loading, showing LoadingSpinner');
      return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
      console.log('Home - not authenticated, rendering null');
      return null;
    }

    console.log('Home - rendering page content:', currentPage);
    switch (currentPage) {
      case PAGES.FORM:
        return <ShiftForm />;
      case PAGES.WARD:
        return <WardForm />;
      case PAGES.DASHBOARD:
        return <Dashboard />;
      default:
        return <ShiftForm />;
    }
  };

  const showNav = isAuthenticated;

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative">
        {showNav && (
          <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        )}
        <main className="container mx-auto px-4">
          <Suspense fallback={<LoadingSpinner />}>
            {renderContent()}
          </Suspense>
        </main>
        
        {/* App version display */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {APP_VERSION}
        </div>
      </div>
    </ErrorBoundary>
  );
}
