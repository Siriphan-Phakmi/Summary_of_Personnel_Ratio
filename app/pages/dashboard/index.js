'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { redirect } from 'next/navigation';

// นำเข้าคอมโพเนนต์ WardForm แทนที่จะนำเข้า WardFormComponent
import WardForm from '../../components/forms/WardForm/WardForm';
import { Container } from '../../components/ui/Container';

export default function Dashboard() {
  const { user, loading } = useAuth();

  // ตรวจสอบว่ามีการ login แล้วหรือยัง
  React.useEffect(() => {
    if (!loading && !user) {
      redirect('/login');
    }
  }, [user, loading]);

  // หากกำลังโหลดข้อมูลผู้ใช้ ให้แสดง loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ถ้ายังไม่มีข้อมูลผู้ใช้ ไม่ต้องแสดงอะไร (จะถูก redirect ไปหน้า login โดย useEffect)
  if (!user) {
    return null;
  }

  // แสดงหน้า Dashboard เมื่อ login สำเร็จ
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <Container>
        <div className="py-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Dashboard</h1>
          
          {/* ใช้งาน WardForm คอมโพเนนต์ */}
          <div className="mb-8">
            <WardForm selectedWard={user?.department || 'unknown'} />
          </div>
        </div>
      </Container>
    </div>
  );
} 