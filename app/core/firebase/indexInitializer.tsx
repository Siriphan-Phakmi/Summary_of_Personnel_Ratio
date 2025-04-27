'use client';

import { useEffect } from 'react';
import { initializeIndexManager } from './indexManager';

/**
 * Component ที่ใช้ในการเรียกใช้ initializeIndexManager เมื่อ Client Component ถูกโหลด
 * จะใช้กับ layout.tsx เพื่อให้เรียกใช้เพียงครั้งเดียวเมื่อแอปเริ่มทำงาน
 */
export default function FirestoreIndexInitializer() {
  useEffect(() => {
    // เรียกใช้ initializeIndexManager เมื่อ component ถูกโหลด
    initializeIndexManager();
  }, []);

  // Component นี้ไม่แสดงผลใดๆ ทำงานเฉพาะใน useEffect
  return null;
} 