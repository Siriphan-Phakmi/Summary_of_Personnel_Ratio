'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

// สร้าง context สำหรับระบบ loading
export interface LoadingContextType {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
}

export const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Provider component
export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const showLoading = () => setIsLoading(true);
  const hideLoading = () => setIsLoading(false);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <div className="text-gray-700 dark:text-gray-300">กำลังโหลด...</div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

// Hook สำหรับเรียกใช้งาน
export const useLoading = () => {
  const context = useContext(LoadingContext);
  
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  
  return context;
};

export default LoadingProvider; 