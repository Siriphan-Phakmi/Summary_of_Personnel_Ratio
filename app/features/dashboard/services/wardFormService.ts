'use client';

import { db } from '@/app/core/firebase/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
import { ShiftType, FormStatus } from '@/app/core/types/ward';
import { logError, logInfo } from '../utils/loggingUtils';

/**
 * ดึงข้อมูลแบบฟอร์มตามวันที่และแผนก
 * @param wardId รหัสแผนก
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @returns ข้อมูลแบบฟอร์มกะเช้าและกะดึก
 */
export const getWardFormsByDateAndWard = async (
  wardId: string, 
  dateString: string
): Promise<{ morning: any | null, night: any | null }> => {
  try {
    if (!wardId || !dateString) {
      return { morning: null, night: null };
    }

    // ดึงข้อมูลกะเช้า - เจาะจงกะเช้าและสถานะ FINAL หรือ APPROVED
    const morningQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('date', '==', dateString),
      where('shift', '==', ShiftType.MORNING),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    // ดึงข้อมูลกะดึก - เจาะจงกะดึกและสถานะ FINAL หรือ APPROVED
    const nightQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('date', '==', dateString),
      where('shift', '==', ShiftType.NIGHT),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    // ดึงข้อมูลพร้อมกันทั้งสองกะ
    const [morningSnapshot, nightSnapshot] = await Promise.all([
      getDocs(morningQuery),
      getDocs(nightQuery)
    ]);

    // แปลงข้อมูลจาก Firestore เป็น Object
    const morningForm = !morningSnapshot.empty ? {
      id: morningSnapshot.docs[0].id,
      ...morningSnapshot.docs[0].data()
    } : null;

    const nightForm = !nightSnapshot.empty ? {
      id: nightSnapshot.docs[0].id,
      ...nightSnapshot.docs[0].data()
    } : null;

    return { morning: morningForm, night: nightForm };
  } catch (error) {
    logError(`[getWardFormsByDateAndWard] Error fetching ward forms for ward ${wardId} on date ${dateString}:`, error);
    return { morning: null, night: null };
  }
};

/**
 * ดึงข้อมูล Census ของทุกแผนก
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @returns Map ของจำนวนผู้ป่วยแยกตามแผนก
 */
export const fetchAllWardCensus = async (dateString: string): Promise<Map<string, number>> => {
  try {
    if (!dateString) {
      return new Map();
    }

    const censusMap = new Map<string, number>();
    
    // ดึงข้อมูลแบบฟอร์มของทุกแผนกในวันที่กำหนด
    const formsQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('date', '==', dateString),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED])
    );
    
    const querySnapshot = await getDocs(formsQuery);
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const wardId = data.wardId?.toUpperCase();
      
      if (wardId) {
        // ใช้ข้อมูลล่าสุดเสมอ
        censusMap.set(wardId, data.patientCensus || 0);
      }
    });
    
    return censusMap;
  } catch (error) {
    logError(`[fetchAllWardCensus] Error fetching census data for date ${dateString}:`, error);
    return new Map();
  }
}; 