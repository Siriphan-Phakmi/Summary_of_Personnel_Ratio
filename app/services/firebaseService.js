'use client';

import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * บันทึกข้อมูลลงใน Firestore
 * @param {string} collectionName - ชื่อคอลเลคชัน
 * @param {object} data - ข้อมูลที่ต้องการบันทึก
 * @returns {Promise<object>} ผลลัพธ์การบันทึกข้อมูล
 */
export async function saveData(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { 
      success: true, 
      id: docRef.id,
      message: 'บันทึกข้อมูลสำเร็จ'
    };
  } catch (error) {
    console.error('Error saving data:', error);
    return { 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    };
  }
}

/**
 * อัปเดตข้อมูลใน Firestore
 * @param {string} collectionName - ชื่อคอลเลคชัน
 * @param {string} docId - ID ของเอกสาร
 * @param {object} data - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} ผลลัพธ์การอัปเดตข้อมูล
 */
export async function updateData(collectionName, docId, data) {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { 
      success: true, 
      message: 'อัปเดตข้อมูลสำเร็จ'
    };
  } catch (error) {
    console.error('Error updating data:', error);
    return { 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
    };
  }
}

/**
 * ลบข้อมูลจาก Firestore
 * @param {string} collectionName - ชื่อคอลเลคชัน
 * @param {string} docId - ID ของเอกสาร
 * @returns {Promise<object>} ผลลัพธ์การลบข้อมูล
 */
export async function deleteData(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { 
      success: true, 
      message: 'ลบข้อมูลสำเร็จ'
    };
  } catch (error) {
    console.error('Error deleting data:', error);
    return { 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล'
    };
  }
}

/**
 * ดึงข้อมูลจาก Firestore โดย ID
 * @param {string} collectionName - ชื่อคอลเลคชัน
 * @param {string} docId - ID ของเอกสาร
 * @returns {Promise<object>} ข้อมูลที่ดึงมา
 */
export async function getDataById(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        data: { id: docSnap.id, ...docSnap.data() }
      };
    } else {
      return { 
        success: false, 
        error: 'ไม่พบข้อมูลที่ต้องการ'
      };
    }
  } catch (error) {
    console.error('Error getting data:', error);
    return { 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    };
  }
}

/**
 * ค้นหาข้อมูลใน Firestore ด้วยเงื่อนไข
 * @param {string} collectionName - ชื่อคอลเลคชัน
 * @param {object} conditions - เงื่อนไขในการค้นหา [{ field: string, operator: string, value: any }]
 * @param {object} sortOptions - ตัวเลือกการเรียงลำดับ { field: string, direction: string }
 * @returns {Promise<array>} ข้อมูลที่ค้นพบ
 */
export async function queryData(collectionName, conditions = [], sortOptions = null) {
  try {
    let q = collection(db, collectionName);
    
    // สร้างคำสั่ง query
    if (conditions.length > 0) {
      const queryConstraints = conditions.map(condition => 
        where(condition.field, condition.operator, condition.value)
      );
      q = query(q, ...queryConstraints);
    }
    
    // เพิ่มการเรียงลำดับ
    if (sortOptions) {
      q = query(q, orderBy(sortOptions.field, sortOptions.direction || 'asc'));
    }
    
    const querySnapshot = await getDocs(q);
    const results = [];
    
    querySnapshot.forEach((doc) => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { 
      success: true, 
      data: results
    };
  } catch (error) {
    console.error('Error querying data:', error);
    return { 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการค้นหาข้อมูล',
      data: []
    };
  }
} 