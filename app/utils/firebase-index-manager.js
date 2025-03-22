'use client';

import { db } from '../lib/firebase';
import { query, collection, getDocs, where, limit } from 'firebase/firestore';
import { SwalAlert } from './alertService';

/**
 * ฟังก์ชันสำหรับตรวจสอบและจัดการ Firebase Index Error
 */

// เก็บประวัติ indexes ที่ได้รับการตรวจสอบแล้ว
const validatedIndexes = new Set();

// ฟังก์ชันตรวจสอบ query ว่าต้องการ index หรือไม่โดยทำการทดสอบ query ขนาดเล็ก
export const validateFirestoreIndex = async (collectionPath, conditions, orderByFields = []) => {
  try {
    // สร้างรหัสเฉพาะสำหรับ query นี้
    const queryId = generateQueryId(collectionPath, conditions, orderByFields);
    
    // ถ้าเคยตรวจสอบแล้ว ไม่ต้องตรวจสอบอีก
    if (validatedIndexes.has(queryId)) {
      return { success: true, validated: true };
    }
    
    // สร้าง query ขนาดเล็กสำหรับทดสอบ
    const testQuery = buildTestQuery(collectionPath, conditions, orderByFields);
    
    // ทดลองดึงข้อมูล 1 รายการเพื่อตรวจสอบว่ามี index error หรือไม่
    await getDocs(testQuery);
    
    // ถ้าสำเร็จ เพิ่มเข้าไปในรายการที่ตรวจสอบแล้ว
    validatedIndexes.add(queryId);
    
    return { success: true, validated: true };
  } catch (error) {
    console.error('Firebase Index Validation Error:', error);
    
    // ตรวจสอบว่าเป็น index error หรือไม่
    if (error.message && error.message.includes('requires an index')) {
      // แยก URL สำหรับสร้าง index จาก error message
      const indexUrl = extractIndexUrl(error.message);
      
      return { 
        success: false, 
        isIndexError: true, 
        message: error.message,
        indexUrl 
      };
    }
    
    // กรณีเป็น error อื่นๆ
    return { 
      success: false, 
      isIndexError: false, 
      message: error.message 
    };
  }
};

// สร้าง Query ID เพื่อใช้เป็น key ในการเก็บประวัติ
const generateQueryId = (collectionPath, conditions, orderByFields) => {
  const conditionsStr = conditions.map(c => `${c.field}_${c.operator}_${c.value}`).join('|');
  const orderByStr = orderByFields.join('|');
  return `${collectionPath}_${conditionsStr}_${orderByStr}`;
};

// สร้าง test query สำหรับตรวจสอบ
const buildTestQuery = (collectionPath, conditions, orderByFields) => {
  let baseQuery = query(
    collection(db, collectionPath),
    limit(1)
  );
  
  // เพิ่มเงื่อนไข where
  conditions.forEach(condition => {
    baseQuery = query(
      baseQuery,
      where(condition.field, condition.operator, condition.value)
    );
  });
  
  // เพิ่ม orderBy ถ้ามี
  if (orderByFields.length > 0) {
    const { orderBy } = require('firebase/firestore');
    orderByFields.forEach(field => {
      if (typeof field === 'object') {
        baseQuery = query(baseQuery, orderBy(field.field, field.direction));
      } else {
        baseQuery = query(baseQuery, orderBy(field));
      }
    });
  }
  
  return baseQuery;
};

// แยก URL สำหรับสร้าง index จาก error message
const extractIndexUrl = (errorMessage) => {
  const urlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
  return urlMatch && urlMatch[1] ? urlMatch[1] : null;
};

// ฟังก์ชันช่วยแสดง dialog เมื่อพบ index error
export const handleIndexError = async (error, autoOpen = false) => {
  if (error.message && error.message.includes('requires an index')) {
    
    // Extract the index URL from the error message
    const urlMatch = error.message.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
    const indexUrl = urlMatch && urlMatch[1] ? urlMatch[1] : null;
    
    if (indexUrl) {
      
      // เปิด URL ในแท็บใหม่โดยอัตโนมัติถ้าต้องการ
      if (autoOpen) {
        window.open(indexUrl, '_blank');
      }
      
      // สร้าง alert ให้ผู้ใช้เลือกดำเนินการ
      const result = await SwalAlert.fire({
        title: 'ต้องสร้าง Index ก่อน',
        html: `
          <div class="text-left">
            <p class="mb-3">การค้นหานี้ต้องการให้สร้าง index ก่อนจึงจะใช้งานได้</p>
            <p class="text-sm text-gray-600 mb-2">คุณต้องการดำเนินการอย่างไร?</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'รีเฟรชหน้านี้',
        cancelButtonText: 'สร้าง Index ใน Firebase',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#2563eb'
      });
      
      // ถ้าผู้ใช้คลิก "สร้าง Index ใน Firebase"
      if (result.isDismissed) {
        window.open(indexUrl, '_blank');
      }
      
      // ถ้าผู้ใช้คลิก "รีเฟรชหน้านี้"
      if (result.isConfirmed) {
        window.location.reload();
      }
      
      return true;
    }
  }
  
  return false;
};

// ฟังก์ชันสำหรับการ query ที่ปลอดภัย (มีการตรวจสอบ index ก่อน)
export const safeQuery = async (collectionPath, conditions, orderByFields = [], requireIndex = true) => {
  try {
    // ตรวจสอบ index ก่อนถ้าต้องการ
    if (requireIndex) {
      const validationResult = await validateFirestoreIndex(collectionPath, conditions, orderByFields);
      
      if (!validationResult.success) {
        // ถ้าเป็น index error แสดง dialog
        if (validationResult.isIndexError) {
          await handleIndexError({ message: validationResult.message });
        }
        
        return { success: false, error: validationResult.message };
      }
    }
    
    // สร้าง query ตามปกติ
    const queryObj = buildTestQuery(collectionPath, conditions, orderByFields);
    
    // ดึงข้อมูลตามปกติ
    const querySnapshot = await getDocs(queryObj);
    
    // แปลงข้อมูลและส่งกลับ
    const results = [];
    querySnapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Safe Query Error:', error);
    
    // จัดการ index error ถ้าเกิดขึ้น
    const isIndexError = await handleIndexError(error);
    
    return { 
      success: false, 
      error: error.message,
      isIndexError 
    };
  }
};

// ฟังก์ชันสำหรับตรวจสอบและสร้าง indexes ทั้งหมดที่จำเป็นสำหรับแอพ
export const validateRequiredIndexes = async () => {
  const indexTests = [
    // ตัวอย่าง query ที่ต้องการ index
    {
      collection: 'wardDataFinal',
      conditions: [
        { field: 'wardId', operator: '==', value: 'test' },
        { field: 'date', operator: '==', value: '2023-01-01' },
        { field: 'shift', operator: '==', value: 'เช้า' }
      ]
    },
    {
      collection: 'wardDataHistory',
      conditions: [
        { field: 'wardId', operator: '==', value: 'test' },
        { field: 'date', operator: '==', value: '2023-01-01' },
        { field: 'shift', operator: '==', value: 'เช้า' }
      ],
      orderBy: [{ field: 'timestamp', direction: 'desc' }]
    },
    {
      collection: 'wardDailyRecords',
      conditions: [
        { field: 'wardId', operator: '==', value: 'test' },
        { field: 'date', operator: '>=', value: '2023-01-01' },
        { field: 'date', operator: '<=', value: '2023-02-01' }
      ]
    }
  ];
  
  const results = [];
  
  // ทดสอบแต่ละ query
  for (const test of indexTests) {
    try {
      // ตรวจสอบว่า index มีอยู่แล้วหรือไม่
      const validationResult = await validateFirestoreIndex(
        test.collection,
        test.conditions,
        test.orderBy || []
      );
      
      results.push({
        collection: test.collection,
        conditions: test.conditions,
        orderBy: test.orderBy || [],
        success: validationResult.success,
        indexUrl: validationResult.indexUrl || null,
        message: validationResult.message || 'Index validated successfully'
      });
      
      // ถ้าต้องสร้าง index แสดง dialog
      if (!validationResult.success && validationResult.isIndexError) {
        await handleIndexError({ message: validationResult.message }, false);
      }
    } catch (error) {
      console.error('Error validating index:', error);
      results.push({
        collection: test.collection,
        conditions: test.conditions,
        orderBy: test.orderBy || [],
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};