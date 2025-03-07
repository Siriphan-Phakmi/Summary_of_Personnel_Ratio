'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WardForm from '../components/forms/WardForm';
import { useAuth } from '../context/AuthContext';
import AuthGuard from '../components/auth/AuthGuard';
import LoadingScreen from '../components/ui/LoadingScreen';

// APP_VERSION constant
const APP_VERSION = 'v.2.3.3.2025';

export default function WardFormPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen pb-16 relative">
        <main className="container mx-auto px-4 pt-20">
          <WardForm />
        </main>

        {/* App version display */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {APP_VERSION}
        </div>
      </div>
    </AuthGuard>
  );
} 