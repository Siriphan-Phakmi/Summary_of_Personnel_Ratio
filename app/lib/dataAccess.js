'use client';

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  addDoc, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  startAfter,
  endBefore
} from 'firebase/firestore';
import { db } from './firebase';
import { format, subDays, parseISO } from 'date-fns';

// ฟังก์ชันบันทึกข้อมูลเวร (ฉบับร่าง)
export const saveWardDataDraft = async (data) => {
  try {
    if (!data.wardId || !data.date || !data.shift || !data.userId) {
      return {
        success: false,
        error: 'Missing required fields: wardId, date, shift, or userId'
      };
    }

    // สร้าง docId ที่ไม่ซ้ำกัน
    const docId = `${data.date}_${data.wardId}_${data.shift}_${data.userId}`;
    
    // เพิ่ม timestamp สำหรับการเรียงลำดับ
    const draftData = {
      ...data,
      timestamp: serverTimestamp(),
      lastUpdated: new Date().toISOString()
    };
    
    // บันทึกข้อมูลใน collection wardDataDrafts
    await setDoc(doc(db, 'wardDataDrafts', docId), draftData);
    
    return {
      success: true,
      message: 'Draft saved successfully',
      id: docId
    };
  } catch (error) {
    console.error('Error saving ward data draft:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันบันทึกข้อมูลเวร (ฉบับสมบูรณ์)
export const saveWardDataFinal = async (data) => {
  try {
    if (!data.wardId || !data.date || !data.shift) {
      return {
        success: false,
        error: 'Missing required fields: wardId, date, or shift'
      };
    }

    // สร้าง docId ที่ไม่ซ้ำกัน
    const docId = `${data.date}_${data.wardId}_${data.shift}`;
    
    // เพิ่มข้อมูลเพิ่มเติม
    const finalData = {
      ...data,
      isApproved: true,
      isDraft: false,
      timestamp: serverTimestamp(),
      lastUpdated: new Date().toISOString()
    };
    
    // บันทึกข้อมูลใน collection wardDataFinal
    await setDoc(doc(db, 'wardDataFinal', docId), finalData);
    
    return {
      success: true,
      message: 'Data saved as final successfully',
      id: docId
    };
  } catch (error) {
    console.error('Error saving final ward data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันดึงข้อมูลฉบับร่างของผู้ใช้
export const getUserDrafts = async (userId, wardId = null, date = null, shift = null) => {
  try {
    let q = query(
      collection(db, 'wardDataDrafts'),
      where('userId', '==', userId)
    );
    
    // เพิ่มเงื่อนไขการค้นหาตาม wardId (ถ้ามี)
    if (wardId) {
      q = query(q, where('wardId', '==', wardId));
    }
    
    // เพิ่มเงื่อนไขการค้นหาตามวันที่ (ถ้ามี)
    if (date) {
      q = query(q, where('date', '==', date));
    }
    
    // เพิ่มเงื่อนไขการค้นหาตามกะ (ถ้ามี)
    if (shift) {
      q = query(q, where('shift', '==', shift));
    }
    
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      return null;
    }
    
    // แปลงข้อมูลที่ได้เป็น array
    const drafts = [];
    querySnapshot.forEach((doc) => {
      drafts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // เรียงลำดับตามเวลาที่บันทึกล่าสุด
    return drafts.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
      const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error getting user drafts:', error);
    return null;
  }
};

// ฟังก์ชันดึงข้อมูลฉบับร่างล่าสุด
export const getLatestDraft = async (userId, wardId, date, shift) => {
  try {
    const q = query(
      collection(db, 'wardDataDrafts'),
      where('userId', '==', userId),
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      return null;
    }
    
    // ส่งคืนข้อมูลฉบับร่างล่าสุด
    return querySnapshot.docs[0].data();
  } catch (error) {
    console.error('Error getting latest draft:', error);
    return null;
  }
};

// ฟังก์ชันลบข้อมูลฉบับร่าง
export const deleteWardDataDraft = async (draftId) => {
  try {
    await deleteDoc(doc(db, 'wardDataDrafts', draftId));
    
    return {
      success: true,
      message: 'Draft deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting draft:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันบันทึกประวัติการแก้ไขข้อมูล
export const logWardDataHistory = async (data, action, userId) => {
  try {
    if (!data.wardId || !data.date || !data.shift) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }
    
    // ข้อมูลประวัติ
    const historyData = {
      wardId: data.wardId,
      date: data.date,
      shift: data.shift,
      action: action, // 'save_draft', 'submit_final', 'approve', 'reject'
      userId: userId,
      userDisplayName: data.userDisplayName || '',
      timestamp: serverTimestamp(),
      data: data // เก็บข้อมูลทั้งหมดในขณะนั้น
    };
    
    // บันทึกประวัติ
    const docRef = await addDoc(collection(db, 'wardDataHistory'), historyData);
    
    return {
      success: true,
      message: 'History logged successfully',
      id: docRef.id
    };
  } catch (error) {
    console.error('Error logging history:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันดึงประวัติการแก้ไข
export const getWardDataHistory = async (wardId, date, shift) => {
  try {
    const q = query(
      collection(db, 'wardDataHistory'),
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // ถ้าไม่พบข้อมูล
    if (querySnapshot.empty) {
      return [];
    }
    
    // แปลงข้อมูลที่ได้เป็น array
    const history = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // แปลง timestamp เป็น string ถ้ามี
      const timestamp = data.timestamp instanceof Timestamp 
        ? data.timestamp.toDate().toISOString()
        : data.timestamp;
      
      history.push({
        id: doc.id,
        ...data,
        timestamp: timestamp
      });
    });
    
    return history;
  } catch (error) {
    console.error('Error getting ward data history:', error);
    return [];
  }
};

/**
 * ฟังก์ชันตรวจสอบข้อมูลย้อนหลัง 7 วัน
 * @param {string} wardId รหัส ward
 * @param {Date} currentDate วันที่ปัจจุบัน (optional)
 * @returns {Promise<boolean>} true ถ้ามีข้อมูลย้อนหลัง 7 วัน, false ถ้าไม่มี
 */
export const checkLast7DaysData = async (wardId, currentDate = new Date()) => {
  try {
    if (!wardId) {
      console.error('Ward ID is required');
      return false;
    }

    // คำนวณวันที่ 7 วันย้อนหลัง
    const sevenDaysAgo = subDays(currentDate, 7);
    const startDate = format(sevenDaysAgo, 'yyyy-MM-dd');
    const endDate = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`Checking for data between ${startDate} and ${endDate} for ward ${wardId}`);
    
    // ค้นหาข้อมูลในตาราง wardDataFinal
    const q = query(
      collection(db, 'wardDataFinal'),
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    
    // ถ้ามีข้อมูลใน wardDataFinal
    if (!querySnapshot.empty) {
      return true;
    }
    
    // ถ้าไม่มีข้อมูลใน wardDataFinal ให้ตรวจสอบใน wardDataDrafts
    const draftsQuery = query(
      collection(db, 'wardDataDrafts'),
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<', endDate)
    );
    
    const draftsSnapshot = await getDocs(draftsQuery);
    
    return !draftsSnapshot.empty;
  } catch (error) {
    console.error('Error checking last 7 days data:', error);
    return false;
  }
};