'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth';
import NavBar from '@/app/core/ui/NavBar';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold mb-6">หน้าแรก</h1>
          <p className="mb-4">ยินดีต้อนรับสู่ระบบ! เลือกเมนูที่ต้องการจากแถบนำทางด้านบน</p>
          
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
      className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(link)}
    >
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}