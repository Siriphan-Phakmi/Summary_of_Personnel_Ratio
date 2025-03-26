'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { FiClipboard, FiCheckSquare, FiBarChart2, FiUsers, FiLoader } from 'react-icons/fi';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if the user is not authenticated and not loading
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
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
            <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login in the useEffect
  }

  return (
    <div className="max-w-6xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold text-xl">
            BPK-9
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight">
          <span className="block">BPK Personnel Ratio System</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Welcome {user.firstName}! Manage nursing staff data and track patient census for BPK Hospital.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Link href="/wardform" className="group relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-6 right-6 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
            <FiClipboard className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ward Form</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Submit census and staff data for your assigned wards.
          </p>
        </Link>

        <Link href="/approval" className="group relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-6 right-6 h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
            <FiCheckSquare className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Approval</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Review and approve ward data submissions.
          </p>
        </Link>

        <Link href="/dashboard" className="group relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-6 right-6 h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
            <FiBarChart2 className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dashboard</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View analytics and trends for hospital wards.
          </p>
        </Link>

        {user.role === 'admin' && (
          <Link href="/user-management" className="group relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-6 right-6 h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 group-hover:bg-yellow-600 group-hover:text-white transition-colors duration-300">
              <FiUsers className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Manage user accounts and permissions.
            </p>
          </Link>
        )}
      </div>

      <div className="mt-16 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Wards</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{user.wards?.length || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 capitalize">{user.role}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Shift</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'Morning' : 'Night'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} BPK Hospital. All rights reserved.</p>
        <p className="mt-2">Version 1.0.0</p>
      </div>
    </div>
  );
}
