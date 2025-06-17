'use client';

import React from 'react';
import { useAuth } from '@/app/features/auth';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/app/features/auth/types/user';

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

const ProtectedPage: React.FC<ProtectedPageProps> = ({ children, requiredRole }) => {
  const { user, authStatus, checkRole } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (authStatus === 'authenticated') {
    if (requiredRole && !checkRole(requiredRole)) {
      // You can redirect to an unauthorized page or show a message
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-red-500">You are not authorized to view this page.</p>
        </div>
      );
    }
    return <>{children}</>;
  }

  return null;
};

export default ProtectedPage; 