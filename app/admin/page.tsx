'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

// This page acts as a redirect handler for the /admin base route
export default function AdminRedirectPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to load
    if (!isLoading) {
      if (user) {
        // Only admins should access /admin routes
        if (user.role === 'admin') {
          // Redirect admin to the main admin page (e.g., user management)
          router.push('/admin/users'); 
        } else {
          // Non-admin logged-in users go back to home
          router.push('/home');
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