'use client';

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  startAfter,
  endBefore,
  doc,
  getDoc,
  Timestamp,
  setDoc 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format, subDays, parseISO } from 'date-fns';

/**
 * ฟังก์ชันสำหรับตรวจสอบว่ามีข้อมูลกะเช้าหรือไม่
 * @param {Date} date วันที่ต้องการตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @returns {Promise<boolean>} true ถ้ามีข้อมูลกะเช้า, false ถ้าไม่มี
 */
export const checkMorningShiftDataExists = async (date, wardId) => {
  try {
    if (!date || !wardId) return false;
    
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    
    // ตรวจสอบข้อมูลในตาราง wardDataFinal สำหรับกะเช้า
    const q = query(
      collection(db, 'wardDataFinal'),
      where('wardId', '==', wardId),
      where('date', '==', formattedDate),
      where('shift', '==', '07:00-19:00')
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking morning shift data:', error);
    return false;
  }
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูล 7 วันย้อนหลัง
 * @param {string} wardId รหัส ward
 * @param {Date} currentDate วันที่ปัจจุบัน (optional)
 * @returns {Promise<Object|null>} ข้อมูลล่าสุดภายใน 7 วันย้อนหลัง หรือ null ถ้าไม่พบข้อมูล
 */
export const fetchLast7DaysData = async (wardId, currentDate = new Date()) => {
  try {
    if (!wardId) {
      console.error('Ward ID is required');
      return null;
    }

    // คำนวณวันที่ 7 วันย้อนหลัง
    const sevenDaysAgo = subDays(currentDate, 7);
    const startDate = format(sevenDaysAgo, 'yyyy-MM-dd');
    const endDate = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`Searching for data between ${startDate} and ${endDate} for ward ${wardId}`);
    
    // ค้นหาข้อมูลในตาราง wardDataFinal
    const q = query(
      collection(db, 'wardDataFinal'),
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // กรณีไม่พบข้อมูลใน wardDataFinal ให้ค้นหาใน wardDataDrafts
    if (querySnapshot.empty) {
      console.log('No final data found, checking drafts...');
      const draftsQuery = query(
        collection(db, 'wardDataDrafts'),
        where('wardId', '==', wardId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const draftsSnapshot = await getDocs(draftsQuery);
      
      if (draftsSnapshot.empty) {
        console.log('No data found in the last 7 days');
        return null;
      }
      
      // เลือกข้อมูลล่าสุด
      const latestDraft = draftsSnapshot.docs[0].data();
      console.log('Found latest draft data:', latestDraft);
      return latestDraft;
    }
    
    // เลือกข้อมูลล่าสุด
    const latestData = querySnapshot.docs[0].data();
    console.log('Found latest final data:', latestData);
    return latestData;
  } catch (error) {
    console.error('Error fetching last 7 days data:', error);
    return null;
  }
};

/**
 * ฟังก์ชันสำหรับคำนวณ Patient Census
 * @param {object} data ข้อมูลที่ใช้ในการคำนวณ
 * @returns {string} ผลลัพธ์การคำนวณ
 */
export const calculatePatientCensus = (data) => {
  // ตรวจสอบว่ามีข้อมูลหรือไม่
  if (!data) return '';
  
  // แปลงค่าให้เป็นตัวเลข
  const newAdmit = parseInt(data.newAdmit || '0');
  const transferIn = parseInt(data.transferIn || '0');
  const referIn = parseInt(data.referIn || '0');
  const transferOut = parseInt(data.transferOut || '0');
  const referOut = parseInt(data.referOut || '0');
  const discharge = parseInt(data.discharge || '0');
  const dead = parseInt(data.dead || '0');
  
  // คำนวณค่า Patient Census
  const census = (newAdmit + transferIn + referIn) - (transferOut + referOut + discharge + dead);
  
  // ตรวจสอบว่ามีการป้อนค่าหรือไม่
  const hasInput = newAdmit !== 0 || transferIn !== 0 || referIn !== 0 || 
                  transferOut !== 0 || referOut !== 0 || discharge !== 0 || dead !== 0;
  
  // ถ้าไม่มีการป้อนค่าใด ๆ ให้คืนค่าเป็น string ว่าง
  if (!hasInput) return '';
  
  // ถ้ามีการป้อนค่า ให้คืนค่าเป็นตัวเลขหรือศูนย์
  return String(census);
};

/**
 * ฟังก์ชันสำหรับตรวจสอบสถานะการอนุมัติขั้นสุดท้าย
 * @param {Date} date วันที่ต้องการตรวจสอบ
 * @param {string} wardId รหัสวอร์ด
 * @param {string} shift กะการทำงาน
 * @returns {Promise<boolean>} true ถ้าได้รับการอนุมัติแล้ว, false ถ้ายังไม่ได้รับการอนุมัติ
 */
export const checkFinalApprovalStatus = async (date, wardId, shift) => {
  try {
    if (!date || !wardId || !shift) return false;
    
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    
    // ตรวจสอบข้อมูลในตาราง wardDataFinal
    const docId = `${formattedDate}_${wardId}_${shift}`;
    const docRef = doc(db, 'wardDataFinal', docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.approvalStatus === 'approved';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking final approval status:', error);
    return false;
  }
};