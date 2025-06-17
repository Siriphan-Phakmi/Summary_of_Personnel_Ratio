import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  documentId 
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { Ward } from '@/app/features/ward-form/types/ward';
import { COLLECTION_WARDS } from '../constants';
import { Logger } from '@/app/lib/utils/logger';

/**
 * ดึงข้อมูลแผนกทั้งหมด
 * @returns รายการแผนกทั้งหมด
 */
export const getAllWards = async (): Promise<Ward[]> => {
  try {
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      orderBy('wardOrder', 'asc')
    );
    
    const querySnapshot = await getDocs(wardQuery);
    const wards: Ward[] = [];
    
    querySnapshot.forEach((doc) => {
      const wardData = doc.data() as Ward;
      wards.push({
        ...wardData,
        id: doc.id
      });
    });
    
    return wards;
  } catch (error) {
    console.error('Error getting all wards:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกทั้งหมดที่เปิดใช้งาน
 * @returns รายการแผนกที่เปิดใช้งาน
 */
export const getActiveWards = async (): Promise<Ward[]> => {
  try {
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      where('active', '==', true),
      orderBy('wardOrder', 'asc')
    );
    
    const querySnapshot = await getDocs(wardQuery);
    const wards: Ward[] = [];
    
    querySnapshot.forEach((doc) => {
      const wardData = doc.data() as Ward;
      wards.push({
        ...wardData,
        id: doc.id
      });
    });
    
    return wards;
  } catch (error) {
    console.error('Error getting active wards:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกตาม ID
 * @param wardId ID ของแผนก
 * @returns ข้อมูลแผนก หรือ null ถ้าไม่พบ
 */
export const getWardById = async (wardId: string): Promise<Ward | null> => {
  try {
    const wardDoc = await getDoc(doc(db, COLLECTION_WARDS, wardId));
    
    if (!wardDoc.exists()) {
      return null;
    }
    
    const wardData = wardDoc.data() as Ward;
    return {
      ...wardData,
      id: wardDoc.id
    };
  } catch (error) {
    console.error('Error getting ward by ID:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกตามรหัสแผนก
 * @param code รหัสแผนก
 * @returns ข้อมูลแผนก หรือ null ถ้าไม่พบ
 */
export const getWardByCode = async (code: string): Promise<Ward | null> => {
  try {
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      where('wardCode', '==', code.toUpperCase()),
      limit(1)
    );
    
    const querySnapshot = await getDocs(wardQuery);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const wardDoc = querySnapshot.docs[0];
    const wardData = wardDoc.data() as Ward;
    
    return {
      ...wardData,
      id: wardDoc.id
    };
  } catch (error) {
    console.error('Error getting ward by code:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลแผนกตามรายการ IDs
 * @param wardIds รายการ ID ของแผนก
 * @returns รายการแผนก
 */
export const getWardsByIds = async (wardIds: string[]): Promise<Ward[]> => {
  try {
    if (wardIds.length === 0) {
      return [];
    }
    
    // หากมีจำนวนแผนกที่เข้าถึงได้มากกว่า 10 แผนก ใช้วิธีดึงข้อมูลทั้งหมดแล้วกรอง
    if (wardIds.length > 10) {
      const allWards = await getAllWards();
      return allWards.filter(ward => wardIds.includes(ward.id));
    }
    
    // ถ้าแผนกไม่มาก ให้ใช้ 'in' query เพื่อประสิทธิภาพที่ดีกว่า
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      where(documentId(), 'in', wardIds),
      orderBy('wardOrder', 'asc')
    );
    
    const querySnapshot = await getDocs(wardQuery);
    const wards: Ward[] = [];
    
    querySnapshot.forEach((doc) => {
      const wardData = doc.data() as Ward;
      wards.push({
        ...wardData,
        id: doc.id
      });
    });
    
    return wards;
  } catch (error) {
    console.error('Error getting wards by IDs:', error);
    throw error;
  }
}; 