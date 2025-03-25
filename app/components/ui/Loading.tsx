'use client';

import React from 'react';

type LoadingProps = {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
};

export default function Loading({ size = 'md', fullScreen = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const spinnerClasses = `animate-spin rounded-full border-t-transparent border-solid border-4 ${sizeClasses[size]}`;
  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 z-50' 
    : 'flex items-center justify-center py-4';

  return (
    <div className={containerClasses}>
      <div className={spinnerClasses} style={{ borderTopColor: 'transparent', borderLeftColor: '#3b82f6', borderRightColor: '#3b82f6', borderBottomColor: '#3b82f6' }}></div>
    </div>
  );
} 