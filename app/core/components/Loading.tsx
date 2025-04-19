'use client';

import React, { createContext, useState, useCallback, useContext } from 'react';
import Image from 'next/image';

interface LoadingContextType {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
}

export const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const showLoading = useCallback(() => setIsLoading(true), []);
  const hideLoading = useCallback(() => setIsLoading(false), []);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
      {children}
      {isLoading && <LoadingOverlay />}
    </LoadingContext.Provider>
  );
};

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center bg-white/90 dark:bg-gray-800/90 p-6 rounded-lg shadow-lg">
        <div className="w-20 h-20 mb-4 overflow-hidden rounded-full bg-white shadow-md flex items-center justify-center">
          <Image 
            src="/images/BPK.jpg" 
            alt="BPK Logo" 
            width={80} 
            height={80}
            className="animate-pulse" 
          />
        </div>
        <p className="mt-2 text-xl font-medium text-gray-700 dark:text-gray-300">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
} 