'use client';

import { Ward } from '@/app/core/types/ward';
import { db } from '@/app/core/firebase/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { logError, logInfo } from '../utils/loggingUtils';
import { getWardsByUserPermission as getWardsByUserPermissionOriginal, getAllWards as getAllWardsOriginal } from '@/app/features/ward-form/services/wardService';
import { User } from '@/app/core/types/user';

/**
 * ดึงข้อมูล Ward ตาม ID
 * @param wardId รหัส Ward
 * @returns ข้อมูล Ward หรือ null ถ้าไม่พบ
 */
export const getWardById = async (wardId: string): Promise<Ward | null> => {
  try {
    if (!wardId) return null;
    
    const wardRef = doc(db, 'wards', wardId);
    const wardDoc = await getDoc(wardRef);
    
    if (wardDoc.exists()) {
      return { id: wardDoc.id, ...wardDoc.data() } as Ward;
    } else {
      // กรณีไม่พบเอกสารโดยตรง ให้ค้นหาจาก query
      const wardsQuery = query(
        collection(db, 'wards'), 
        where('id', '==', wardId)
      );
      
      const querySnapshot = await getDocs(wardsQuery);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Ward;
      }
      
      return null;
    }
  } catch (error) {
    logError(`[getWardById] Error fetching ward with ID ${wardId}:`, error);
    return null;
  }
};

/**
 * ดึงข้อมูล Ward ทั้งหมด
 * @returns รายการ Ward ทั้งหมด
 */
export const getAllWards = async (): Promise<Ward[]> => {
  try {
    return await getAllWardsOriginal();
  } catch (error) {
    logError('[getAllWards] Error fetching all wards:', error);
    return [];
  }
};

/**
 * ดึงข้อมูล Ward ตามสิทธิ์ของผู้ใช้
 * @param user ข้อมูลผู้ใช้
 * @returns รายการ Ward ที่ผู้ใช้มีสิทธิ์เข้าถึง
 */
export const getWardsByUserPermission = async (user: User): Promise<Ward[]> => {
  try {
    return await getWardsByUserPermissionOriginal(user);
  } catch (error) {
    logError('[getWardsByUserPermission] Error fetching wards by user permission:', error);
    return [];
  }
}; 