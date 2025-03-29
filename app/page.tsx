'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to home page
    if (user && !isLoading) {
      router.push('/home');
    } else if (!isLoading) {
      // If not logged in and not loading, redirect to login page
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Show a simple loading state while checking
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 