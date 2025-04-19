'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';

// This page acts as a redirect handler for the /admin base route
export default function AdminRedirectPage() {
  const { user, authStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to load
    if (authStatus !== 'loading') {
      if (user && authStatus === 'authenticated') {
        // Only admins or developers should access /admin routes
        if (user.role === 'admin' || user.role === 'developer') {
          // Redirect admin/developer to the main admin page (e.g., user management)
          router.push('/admin/users'); 
        } else {
          // Non-admin logged-in users go back to home
          router.push('/home');
        }
      } else if (authStatus === 'unauthenticated') {
        // Not logged in, redirect to login
        router.push('/login');
      }
    }
  }, [user, authStatus, router]);

  // Display a loading indicator while redirecting or loading
  if (authStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Return null or the loading indicator while redirect is happening after loading
  return null; 
} 