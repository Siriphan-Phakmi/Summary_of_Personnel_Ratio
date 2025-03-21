'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './components/common/LoadingSpinner';
import { useAuth } from './context/AuthContext';
import PageLayout from './components/layouts/PageLayout';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ถ้ายังไม่ได้ authenticate ให้ไปหน้า login
    if (!loading && !isAuthenticated) {
      router.push('/page/login/');
    } 
    // ถ้า authenticate แล้ว ให้นำทางตามบทบาท
    else if (!loading && isAuthenticated && user) {
      const userRole = user.role?.toLowerCase() || 'user';
      
      // นำทางตามบทบาทของผู้ใช้
      if (userRole === 'admin' || userRole === 'approver') {
        console.log('Redirecting admin/approver to approval page...');
        router.push('/page/approval/');
      } else {
        console.log('Department check for redirection:', user.department);
        
        // เพิ่มการตรวจสอบ department
        if (!user.department || user.department === '') {
          console.error('User does not have a department assigned');
          // ให้ redirect ไปหน้า dashboard หรือหน้าแจ้งเตือนแทนที่จะไปหน้า ward-form
          router.push('/page/dashboard/');
        } else {
          console.log('Redirecting user to ward-form page...');
          router.push('/page/ward-form/');
        }
      }
    }
  }, [loading, isAuthenticated, router, user]);

  // แสดง loading ระหว่างที่กำลังตรวจสอบและนำทาง
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
