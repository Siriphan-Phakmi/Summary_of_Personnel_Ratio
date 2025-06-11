'use client';

import { useEffect } from 'react';
import { initializeIndexManager } from './indexManager';

/**
 * Component ที่ใช้ในการเรียกใช้ initializeIndexManager เมื่อ Client Component ถูกโหลด
 * จะใช้กับ layout.tsx เพื่อให้เรียกใช้เพียงครั้งเดียวเมื่อแอปเริ่มทำงาน
 * ทำงานเฉพาะในโหมด development เท่านั้น
 */
export default function FirestoreIndexInitializer() {
  useEffect(() => {
    // เรียกใช้ initializeIndexManager เมื่อ component ถูกโหลด เฉพาะในโหมด development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Initializing Firestore Index Manager (development mode only)');
      initializeIndexManager();
    }
  }, []);

  // Component นี้ไม่แสดงผลใดๆ ทำงานเฉพาะใน useEffect
  return null;
} 