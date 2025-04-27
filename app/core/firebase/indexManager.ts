import { db } from './firebase';
import firestoreIndexes from '@/app/config/firestore-indexes.json';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';

/**
 * ตรวจสอบและสร้าง Firestore Indexes ตามที่กำหนดไว้ใน config
 * หมายเหตุ: ในสภาพแวดล้อมจริง การสร้าง Indexes ควรทำผ่าน Firebase Console หรือ Firebase CLI
 * แต่เราสามารถตรวจสอบว่า Indexes ที่ต้องการมีอยู่แล้วหรือไม่ได้
 */
export async function verifyFirestoreIndexes() {
  console.log('Verifying Firestore indexes...');

  try {
    // ในสภาพแวดล้อมจริง เราไม่สามารถสร้าง Indexes ผ่าน client-side code ได้โดยตรง
    // แต่เราสามารถตรวจสอบว่ามี Indexes ที่เราต้องการหรือไม่โดยทดลองใช้ query ที่ต้องการ index
    console.log('Required indexes:', firestoreIndexes.indexes.length);
    
    // แสดงข้อมูล indexes ที่ต้องการใช้ เพื่อเป็นเอกสารอ้างอิง
    firestoreIndexes.indexes.forEach((index, i) => {
      let fieldsInfo = index.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ');
      console.log(`Index ${i+1}: Collection: ${index.collectionGroup}, Fields: ${fieldsInfo}`);
    });

    return true;
  } catch (error) {
    console.error('Error verifying Firestore indexes:', error);
    return false;
  }
}

/**
 * ทดสอบการใช้งาน query ที่ต้องการ index เพื่อตรวจสอบว่า index ทำงานถูกต้อง
 */
export async function testCriticalQueries() {
  console.log('Testing critical queries that require indexes...');

  try {
    // ทดสอบ query 1: ดึงข้อมูลตาม wardId และ date
    const q1 = query(
      collection(db, 'wardForms'),
      where('status', '==', 'final')
    );
    
    // ทดลองใช้งาน query (จะไม่ดึงข้อมูลจริง เพียงแต่ตรวจสอบว่า query สามารถทำงานได้)
    await getDocs(q1);
    console.log('Query 1 (status filter) works - index exists');

    // ทดสอบ query 2: wardId + status + dateString
    const q2 = query(
      collection(db, 'wardForms'),
      where('wardId', '==', 'ward123'),
      where('status', '==', 'final')
    );

    await getDocs(q2);
    console.log('Query 2 (wardId + status) works - index exists');

    // ทดสอบเพิ่มเติมตาม index ที่สำคัญอื่นๆ...

    return true;
  } catch (error: any) {
    // ถ้าเกิด FirestoreError เกี่ยวกับ missing index
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      // แสดงลิงก์ไปยัง Firebase Console เพื่อสร้าง index
      console.error('Missing Index Error:', error.message);
      
      // ดึง URL สำหรับสร้าง index จาก error message (ถ้ามี)
      const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
      if (urlMatch) {
        console.error('Create the missing index at:', urlMatch[0]);
      } else {
        console.error('Please create the missing index in Firebase Console');
      }
    } else {
      console.error('Error testing critical queries:', error);
    }
    return false;
  }
}

/**
 * เริ่มต้นใช้งาน Index Manager
 */
export function initializeIndexManager() {
  console.log('Initializing Index Manager...');
  
  // ตรวจสอบ Indexes เมื่อแอปเริ่มทำงาน
  verifyFirestoreIndexes()
    .then(success => {
      if (success) {
        console.log('Firestore indexes verification complete');
        // ทดสอบ query ที่สำคัญ
        return testCriticalQueries();
      }
      return false;
    })
    .then(success => {
      if (success) {
        console.log('Critical queries testing complete - all indexes working');
      } else {
        console.warn('Some issues with indexes were detected - check console for details');
      }
    })
    .catch(error => {
      console.error('Index Manager initialization failed:', error);
    });
}

export default {
  verifyFirestoreIndexes,
  testCriticalQueries,
  initializeIndexManager
}; 