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

export default function Home() {
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
      return null; // Will redirect in useEffect
    }

    // แก้ไขให้แสดงเนื้อหาตาม currentPage โดยไม่ต้องตรวจสอบ role
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

  // แก้ไขให้แสดง Navigation สำหรับทุกคนที่ login แล้ว
  const showNav = isAuthenticated;

  return (
    <AuthGuard>
      <ErrorBoundary>
        <div>
          {showNav && (
            <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
          )}

          {/* Content */}
          <main className="container mx-auto px-4">
            <Suspense fallback={<LoadingSpinner />}>
              {renderContent()}
            </Suspense>
          </main>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}
