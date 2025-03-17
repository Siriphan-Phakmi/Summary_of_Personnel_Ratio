'use client';
import { useEffect, useState } from 'react';
import WardForm from '../../components/forms/WardForm';
import PageLayout from '../../components/layouts/PageLayout';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';

export default function WardFormPage() {
  const { user, loading } = useAuth();
  const [wardId, setWardId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // รอจนกว่าจะโหลดข้อมูล user เสร็จสมบูรณ์
    if (!loading) {
      if (user?.department) {
        setWardId(user.department);
      } else {
        // หากไม่มี department ให้ใช้ค่าว่าง
        setWardId('');
      }
      // ทำเครื่องหมายว่าพร้อมสำหรับการแสดง WardForm
      setIsReady(true);
    }
  }, [user, loading]);

  return (
    <PageLayout title="แบบฟอร์มบันทึกข้อมูล Ward">
      <div className="flex flex-col items-center justify-center w-full">
        {isReady ? (
          <div className="w-full max-w-4xl mx-auto">
            <WardForm wardId={wardId} />
          </div>
        ) : (
          <div className="flex justify-center items-center p-8">
            <LoadingScreen />
          </div>
        )}
      </div>
    </PageLayout>
  );
} 