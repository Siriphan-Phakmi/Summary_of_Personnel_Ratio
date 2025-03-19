'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WardForm from '../components/forms/WardForm/WardForm';
import { useAuth } from '../context/AuthContext';
import AuthGuard from '../components/auth/AuthGuard';
import LoadingScreen from '../components/ui/LoadingScreen';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

// APP_VERSION constant
const APP_VERSION = 'v.2.3.3.2025';

export default function WardPage() {
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
      <AuthProvider>
        <ThemeProvider>
          <div className="min-h-screen pb-16 relative">
            <main className="container mx-auto px-4 pt-20">
              <div className="bg-blue-50 p-4 mb-6 rounded-lg border border-blue-200">
                <h2 className="font-medium text-blue-700 mb-2">บันทึกข้อมูล Ward</h2>
                <p className="text-sm text-blue-600">กรุณาเลือกวันที่และกะที่ต้องการบันทึกข้อมูล คุณสามารถบันทึกเป็นฉบับร่างหรือบันทึกสมบูรณ์ เพื่อส่งให้ Supervisor อนุมัติได้</p>
              </div>
              <WardForm />
            </main>

            {/* App version display */}
            <div className="fixed bottom-4 right-4 text-sm text-gray-500">
              {APP_VERSION}
            </div>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </AuthGuard>
  );
} 