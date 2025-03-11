'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import AppVersion from '../components/common/AppVersion';

export function Providers({ children }) {
  useEffect(() => {
    console.log('Providers component mounted');
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <AppVersion />
      </AuthProvider>
    </ThemeProvider>
  );
} 