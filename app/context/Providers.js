'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import AppVersion from '../components/common/AppVersion';

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <AppVersion />
    </AuthProvider>
  );
} 