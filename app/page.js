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

// APP_VERSION constant
const APP_VERSION = 'v.2.3.3.2025';

export default function Home() {
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    // ลบเงื่อนไขการ redirect  user role
  }, [loading, isAuthenticated, router]);

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
