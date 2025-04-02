'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/features/auth';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import CollectionManager from './components/CollectionManager';
import { Toaster } from 'react-hot-toast';

/**
 * หน้าจัดการฐานข้อมูล Firestore
 */
export default function DatabaseManagementPage() {
  return (
    <ProtectedPage requiredRole={['admin', 'developer']}>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* แสดง Toaster สำหรับการแจ้งเตือน */}
        <Toaster position="top-right" />
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            การจัดการฐานข้อมูล Firebase
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            จัดการคอลเลกชันและเอกสารสำหรับ Firestore
          </p>
        </div>
        
        {/* แสดงคอมโพเนนต์จัดการคอลเลกชันโดยตรง */}
        <CollectionManager />
      </div>
    </ProtectedPage>
  );
} 