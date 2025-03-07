'use client';

import { Providers } from './context/Providers';
import { useEffect } from 'react';
import Navbar from './components/common/Navbar';

export default function ClientLayout({ children }) {
  useEffect(() => {
    console.log('ClientLayout mounted - setting up providers');
  }, []);

  return (
    <Providers>
      <Navbar />
      <div className="pt-16">
        {children}
      </div>
    </Providers>
  );
} 