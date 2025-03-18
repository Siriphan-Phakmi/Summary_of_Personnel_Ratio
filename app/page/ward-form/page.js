'use client';
import { useEffect, useState } from 'react';
import WardForm from '../../components/forms/WardForm';
import PageLayout from '../../components/layouts/PageLayout';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useRouter } from 'next/navigation';

export default function WardFormPage() {
  const { user, loading } = useAuth();
  const [wardId, setWardId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Add timeout to prevent indefinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (!isReady && loading) {
        setError('การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(loadingTimeout);
  }, [isReady, loading]);

  useEffect(() => {
    // Only process when loading is complete
    if (!loading) {
      try {
        if (user) {
          // User is logged in
          console.log('User department:', user?.department);
          setWardId(user?.department || '');
          setIsReady(true);
        } else {
          // User not logged in, redirect to login
          console.log('User not authenticated, redirecting to login');
          router.push('/page/login?redirect=/page/ward-form');
        }
      } catch (err) {
        console.error('Error in ward form page:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
      }
    }
  }, [user, loading, router]);

  // Handle error state
  if (error) {
    return (
      <PageLayout title="แบบฟอร์มบันทึกข้อมูล Ward">
        <div className="flex flex-col items-center justify-center w-full p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-red-800 font-semibold text-lg mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                ลองใหม่
              </button>
              <button
                onClick={() => router.push('/page/dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="แบบฟอร์มบันทึกข้อมูล Ward">
      <div className="flex flex-col items-center justify-center w-full">
        {isReady ? (
          <div className="w-full max-w-4xl mx-auto">
            <WardForm selectedWard={wardId} />
          </div>
        ) : (
          <div className="flex justify-center items-center p-8">
            <LoadingScreen showRetry={true} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}