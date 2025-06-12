'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'blue' | 'gray' | 'white';
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'กำลังโหลดข้อมูล...',
  size = 'md',
  variant = 'blue',
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const variantClasses = {
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    white: 'border-white'
  };

  const spinnerClasses = `animate-spin rounded-full border-t-2 border-b-2 ${sizeClasses[size]} ${variantClasses[variant]}`;

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={spinnerClasses}></div>
      {message && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-center">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner; 