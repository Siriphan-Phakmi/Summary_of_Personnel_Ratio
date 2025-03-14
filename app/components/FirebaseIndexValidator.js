'use client';

import { useState, useEffect } from 'react';
import { validateRequiredIndexes, handleIndexError } from '../utils/firebase-index-manager';

/**
 * คอมโพเนนต์สำหรับตรวจสอบและสร้าง Firebase Indexes ที่จำเป็น
 * วิธีใช้: เพิ่มคอมโพเนนต์นี้ใน layout.js หรือ ClientLayout.js เพื่อให้ทำงานเมื่อแอพโหลด
 */
const FirebaseIndexValidator = () => {
  const [validationStatus, setValidationStatus] = useState('pending');
  const [missingIndexes, setMissingIndexes] = useState([]);
  
  useEffect(() => {
    const checkIndexes = async () => {
      try {
        // ตรวจสอบ indexes ที่จำเป็นทั้งหมด
        const results = await validateRequiredIndexes();
        
        // กรองเฉพาะ indexes ที่ขาดหายไป
        const missing = results.filter(r => !r.success && r.isIndexError);
        
        setMissingIndexes(missing);
        setValidationStatus(missing.length > 0 ? 'missing' : 'complete');
        
        // ถ้ามี indexes ที่ขาดหายไป ให้แสดงข้อความแจ้งเตือน
        if (missing.length > 0) {
          // จัดการ error แรกที่พบ
          const firstMissingIndex = missing[0];
          if (firstMissingIndex.indexUrl) {
            await handleIndexError({ 
              message: `The query requires an index. You can create it here: ${firstMissingIndex.indexUrl}` 
            }, false);
          }
        }
      } catch (error) {
        console.error('Error validating Firebase indexes:', error);
        setValidationStatus('error');
      }
    };
    
    // รอสักครู่ก่อนเริ่มตรวจสอบเพื่อให้แอพโหลดก่อน
    const timer = setTimeout(() => {
      checkIndexes();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // ไม่แสดงอะไรในหน้า UI
  return null;
};

export default FirebaseIndexValidator; 