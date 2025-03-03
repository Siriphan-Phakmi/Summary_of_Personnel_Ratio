'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import MockDataToggle from '../components/ui/MockDataToggle';

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <MockDataToggle />
    </AuthProvider>
  );
} 