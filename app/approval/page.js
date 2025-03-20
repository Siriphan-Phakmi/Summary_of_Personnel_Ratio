'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ApprovalList from '../components/approval/ApprovalList';
import { useAuth } from '../context/AuthContext';
import AuthGuard from '../components/auth/AuthGuard';
import LoadingScreen from '../components/ui/LoadingScreen';
import { logout } from '../utils/authService';
import { APP_VERSION } from '../config/version';

export default function ApprovalPage() {
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
    <AuthGuard requiredRole="supervisor">
      <div className="min-h-screen pb-16 relative">
        <main className="container mx-auto px-4 pt-20">
          <div className="bg-blue-50 p-4 mb-6 rounded-lg border border-blue-200">
            <h2 className="font-medium text-blue-700 mb-2">หน้าอนุมัติข้อมูล</h2>
            <p className="text-sm text-blue-600">คุณสามารถตรวจสอบและอนุมัติข้อมูลที่ถูกส่งจากผู้ใช้งานได้ที่นี่ โดยแบ่งตามประเภทข้อมูล Ward และ Shift</p>
          </div>
          <ApprovalList />
        </main>

        {/* App version display */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {APP_VERSION}
        </div>
      </div>
    </AuthGuard>
  );
} 