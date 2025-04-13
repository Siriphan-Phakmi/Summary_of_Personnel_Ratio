'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingOverlay } from '@/app/admin/database/components/LoadingOverlay';

type LoadingContextType = {
  showLoading: () => void;
  hideLoading: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  const showLoading = () => {
    setLoadingCount((prev) => prev + 1);
    setIsLoading(true);
  };
  
  const hideLoading = () => {
    setLoadingCount((prev) => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsLoading(false);
        return 0;
      }
      return newCount;
    });
  };

  // Utility function to wrap promises with loading state
  const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
    showLoading();
    try {
      const result = await promise;
      return result;
    } finally {
      hideLoading();
    }
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, withLoading }}>
      {isLoading && <LoadingOverlay />}
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
} 