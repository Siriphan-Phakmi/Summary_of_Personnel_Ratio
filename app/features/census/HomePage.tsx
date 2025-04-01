'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import NavBar from '@/app/core/ui/NavBar';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <div>
          <h1 className="page-title text-light-text dark:text-dark-text">หน้าแรก</h1>
          <p className="mb-4 text-base text-gray-700 dark:text-gray-300">ยินดีต้อนรับสู่ระบบ! เลือกเมนูที่ต้องการจากแถบนำทางด้านบน</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <NavCard
              title="แบบฟอร์ม"
              description="กรอกข้อมูลประจำวัน"
              link="/census/form"
            />
            <NavCard
              title="อนุมัติ"
              description="ตรวจสอบและอนุมัติข้อมูล"
              link="/census/approval"  
            />
            <NavCard
              title="รายงาน"
              description="ดูรายงานและแดชบอร์ด"
              link="/census/dashboard"
            />
            {user?.role === 'admin' && (
               <NavCard
                 title="จัดการผู้ใช้"
                 description="จัดการข้อมูลผู้ใช้งานระบบ"
                 link="/admin/users"
               />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component สำหรับปุ่มนำทางในหน้าแรก
function NavCard({ title, description, link }: { title: string; description: string; link: string }) {
  const router = useRouter();
  
  return (
    <div 
      className="bg-light-card dark:bg-dark-card shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(link)}
    >
      <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-base text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}