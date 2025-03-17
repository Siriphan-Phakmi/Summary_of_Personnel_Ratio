'use client';
import { useEffect, useState } from 'react';
import ShiftForm from '../../components/forms/ShiftForm/ShiftForm';
import PageLayout from '../../components/layouts/PageLayout';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';

export default function ShiftFormPage() {
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    console.log('ShiftFormPage loaded');
  }, []);

  return (
    <PageLayout title="แบบฟอร์มบันทึกข้อมูล Shift">
      {isReady ? (
        <ShiftForm />
      ) : (
        <div className="flex justify-center items-center p-8">
          <LoadingScreen />
        </div>
      )}
    </PageLayout>
  );
} 