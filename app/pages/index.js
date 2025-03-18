'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/ui/LoadingScreen';

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // ถ้าผู้ใช้เข้าสู่ระบบแล้ว ให้นำทางไปยัง WardForm
        // ตรวจสอบบทบาทของผู้ใช้
        if (user?.role === 'admin' || user?.role === 'supervisor') {
          // สำหรับ admin หรือ supervisor ให้นำทางไปที่ Dashboard
          router.push('/dashboard');
        } else {
          // สำหรับผู้ใช้ทั่วไป ให้นำทางไปที่ WardForm
          router.push('/ward');
        }
      } else {
        // ถ้ายังไม่ได้เข้าสู่ระบบ ให้นำทางไปยังหน้า login
        router.push('/login');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // แสดง Loading ระหว่างที่กำลังตรวจสอบสถานะการเข้าสู่ระบบ
  return <LoadingScreen />;
} 