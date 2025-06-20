'use client';

import React from 'react';
import { useAuth } from '@/app/features/auth';
import { UserRole } from '@/app/features/auth/types/user';
import Link from 'next/link';
import { BarChart3, ClipboardCheck, Users, Settings } from 'lucide-react';

/**
 * Home Page - แสดงภาพรวมของระบบและ quick access สำหรับแต่ละ role
 */
export default function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            กำลังโหลด...
          </h1>
        </div>
      </div>
    );
  }

  const quickAccessCards = [
    {
      title: 'บันทึกข้อมูลผู้ป่วย',
      description: 'บันทึกข้อมูลผู้ป่วยรายวัน',
      href: '/census/form',
      icon: ClipboardCheck,
      roles: [UserRole.NURSE, UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER],
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'อนุมัติข้อมูล',
      description: 'อนุมัติข้อมูลผู้ป่วยที่บันทึก',
      href: '/census/approval',
      icon: ClipboardCheck,
      roles: [UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER],
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Dashboard',
      description: 'รายงานและสถิติข้อมูลผู้ป่วย',
      href: '/dashboard',
      icon: BarChart3,
      roles: [UserRole.NURSE, UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER],
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'จัดการผู้ใช้',
      description: 'จัดการบัญชีผู้ใช้ในระบบ',
      href: '/admin/user-management',
      icon: Users,
      roles: [UserRole.ADMIN, UserRole.DEVELOPER],
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'เครื่องมือนักพัฒนา',
      description: 'เครื่องมือสำหรับนักพัฒนา',
      href: '/admin/dev-tools',
      icon: Settings,
      roles: [UserRole.DEVELOPER],
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  const availableCards = quickAccessCards.filter(card => 
    card.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            ยินดีต้อนรับ, {user.firstName} {user.lastName}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
            ระบบจัดการอัตราส่วนบุคลากรโรงพยาบาล
          </p>
          <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium capitalize">
            {user.role}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {availableCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`block p-6 rounded-lg shadow-md text-white transition-all duration-200 transform hover:scale-105 ${card.color}`}
              >
                <div className="flex items-center mb-4">
                  <IconComponent className="h-8 w-8 mr-3" />
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                </div>
                <p className="text-white/90">{card.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              ข้อมูลเพิ่มเติม
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <strong>ชื่อผู้ใช้:</strong> {user.username}
              </div>
              <div>
                <strong>บทบาท:</strong> <span className="capitalize">{user.role}</span>
              </div>
              {user.assignedWardId && (
                <div>
                  <strong>หอผู้ป่วยที่รับผิดชอบ:</strong> {user.assignedWardId}
                </div>
              )}
              {user.approveWardIds && user.approveWardIds.length > 0 && (
                <div>
                  <strong>หอผู้ป่วยที่อนุมัติได้:</strong> {user.approveWardIds.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}