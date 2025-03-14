'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftForm from '../components/forms/ShiftForm';
import { useAuth } from '../context/AuthContext';
import AuthGuard from '../components/auth/AuthGuard';
import LoadingScreen from '../components/ui/LoadingScreen';

// APP_VERSION constant
const APP_VERSION = 'v.2.3.3.2025';

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
    <AuthGuard requiredRole="user">
      <div className="min-h-screen pb-16 relative">
        <main className="container mx-auto px-4 pt-20">
          <div className="bg-yellow-50 p-4 mb-6 rounded-lg border border-yellow-200">
            <h2 className="font-medium text-yellow-700 mb-2">หน้าแสดงผลข้อมูลเท่านั้น</h2>
            <p className="text-sm text-yellow-600">คุณสามารถดูข้อมูลได้ แต่ไม่สามารถแก้ไขหรือบันทึกข้อมูลได้ โดยจะแสดงเฉพาะข้อมูลของ ward ที่คุณสังกัดเท่านั้น</p>
          </div>
          <ShiftForm />
        </main>

        {/* App version display */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {APP_VERSION}
        </div>
      </div>
    </AuthGuard>
  );
} 