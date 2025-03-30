'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

// This page acts as a redirect handler for the /census route
export default function CensusRedirectPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to load
    if (!isLoading) {
      if (user) {
        // Redirect based on role
        if (user.role === 'admin') {
          router.push('/census/approval'); // Admins go to approval
        } else {
          router.push('/census/form'); // Other users go to form
        }
      } else {
        // Not logged in, redirect to login
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Display a loading indicator while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 