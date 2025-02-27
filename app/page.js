'use client';
import { useState, Suspense } from 'react';
import ShiftForm from './components/forms/ShiftForm';
import Dashboard from './components/dashboard/Dashboard';
import WardForm from './components/forms/WardForm';
import Navigation from './components/common/Navigation';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { PAGES } from './config/constants';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);

  const renderContent = () => {
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

  return (
    <ErrorBoundary>
      <div>
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />

        {/* Content */}
        <main className="container mx-auto">
          <Suspense fallback={<LoadingSpinner />}>
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
}