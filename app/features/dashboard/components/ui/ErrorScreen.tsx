'use client';

import React from 'react';
import NavBar from '@/app/components/ui/NavBar';

interface ErrorScreenProps {
  error: string | null;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-2xl text-red-500">
            เกิดข้อผิดพลาด: {error}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen; 