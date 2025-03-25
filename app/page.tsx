'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Loading from '@/app/components/ui/Loading';
import Image from 'next/image';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Short delay to prevent immediate redirect flash
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (user) {
          // Redirect based on user role: admin goes to Approval, others to WardForm
          user.role === 'admin'
            ? router.push('/approval')
            : router.push('/ward-form');
        } else {
          router.push('/login');
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold text-xl">
            BPK-9
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
          BPK Personnel Ratio System
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Nursing staff management and patient census tracking
        </p>
        <div className="flex justify-center">
          <Loading />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Redirecting to the appropriate page...
        </p>
      </div>
    </div>
  );
}
