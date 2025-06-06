'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import Link from 'next/link';
import { FiUserPlus, FiClipboard, FiServer, FiActivity } from 'react-icons/fi';

// This page acts as an Admin Dashboard with links to admin features
export default function AdminRedirectPage() {
  const { user, authStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to load
    if (authStatus !== 'loading') {
      if (!user || authStatus !== 'authenticated') {
        if (authStatus === 'unauthenticated') {
          // Not logged in, redirect to login
          router.push('/login');
        }
      } else if (user.role === 'developer') {
        // Developer users automatically go to dev-tools
        router.push('/admin/dev-tools');
      } else if (user.role !== 'admin') {
        // Non-admin/non-developer logged-in users go back to home
        router.push('/home');
      }
    }
  }, [user, authStatus, router]);

  // Display a loading indicator while checking auth
  if (authStatus === 'loading' || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // If authenticated as admin, show the admin dashboard
  if (user && user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">หน้าควบคุมสำหรับผู้ดูแลระบบ</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <Link href="/admin/users" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
              <div className="flex items-start">
                <FiUserPlus className="text-4xl text-blue-500 dark:text-blue-400 mr-4" />
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">จัดการผู้ใช้</h2>
                  <p className="text-gray-600 dark:text-gray-400">เพิ่ม แก้ไข ลบ หรือเปลี่ยนสถานะผู้ใช้งานในระบบ</p>
                </div>
              </div>
            </Link>
            
            {/* Log Viewer */}
            <Link href="/admin/logs" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
              <div className="flex items-start">
                <FiActivity className="text-4xl text-purple-500 dark:text-purple-400 mr-4" />
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">บันทึกการทำงาน</h2>
                  <p className="text-gray-600 dark:text-gray-400">ดูประวัติการเข้าสู่ระบบ และกิจกรรมผู้ใช้ทั้งหมด</p>
                </div>
              </div>
            </Link>
            
            {/* Dev Tools - Only for Developer */}
            {user.role === 'developer' && (
              <Link href="/admin/dev-tools" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
                <div className="flex items-start">
                  <FiServer className="text-4xl text-red-500 dark:text-red-400 mr-4" />
                  <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">เครื่องมือนักพัฒนา</h2>
                    <p className="text-gray-600 dark:text-gray-400">เครื่องมือขั้นสูงสำหรับการพัฒนาและดีบัก</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Return null while redirect is happening for non-admin/non-developer roles
  return null; 
} 