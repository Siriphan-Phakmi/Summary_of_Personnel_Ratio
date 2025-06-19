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
      const wardData = doc.data();
      wards.push(transformWardDoc(wardData, doc.id));
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
      const wardData = doc.data();
      wards.push(transformWardDoc(wardData, doc.id));
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
    
    const wardData = wardDoc.data();
    return transformWardDoc(wardData, wardDoc.id);
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
    const wardData = wardDoc.data();
    
    return transformWardDoc(wardData, wardDoc.id);
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
    if (!wardIds || wardIds.length === 0) {
      return [];
    }

    // Defensive programming: กรอง ID ที่ไม่ถูกต้องออกไปก่อน
    // Firestore document IDs cannot contain characters like /, *, [, ]
    const validWardIds = wardIds.filter(id => id && !/[/*\[\]]/.test(id));

    if (validWardIds.length === 0) {
      console.warn('[WardService] No valid ward IDs were provided after filtering. Original IDs:', wardIds);
      return [];
    }
    
    // หากมีจำนวนแผนกที่เข้าถึงได้มากกว่า 10 แผนก ใช้วิธีดึงข้อมูลทั้งหมดแล้วกรอง
    // หมายเหตุ: ใช้ validWardIds ในการเปรียบเทียบ
    if (validWardIds.length > 10) {
      const allWards = await getAllWards();
      return allWards.filter(ward => validWardIds.includes(ward.id));
    }
    
    // ถ้าแผนกไม่มาก ให้ใช้ 'in' query เพื่อประสิทธิภาพที่ดีกว่า
    const wardQuery = query(
      collection(db, COLLECTION_WARDS),
      where(documentId(), 'in', validWardIds), // ใช้ ID ที่ผ่านการกรองแล้ว
    );
    
    const querySnapshot = await getDocs(wardQuery);
    const wards: Ward[] = [];
    
    querySnapshot.forEach((doc) => {
      const wardData = doc.data();
      wards.push(transformWardDoc(wardData, doc.id));
    });
    
    // Sort on the client-side after fetching, as orderBy is not compatible with 'in' queries on a different field.
    wards.sort((a, b) => a.wardOrder - b.wardOrder);

    return wards;
  } catch (error) {
    console.error('Error getting wards by IDs:', error);
    throw error;
  }
};

/**
 * Finds a single ward by a code that might have variations in casing or spacing.
 * For example, it can find a ward with wardCode 'Ward6' using search terms like 'ward6', 'Ward 6', or 'ward 6'.
 * This is more flexible than a direct '==' query.
 *
 * @param searchCode - The code to search for (e.g., "6", "ward6").
 * @returns A Ward object if found, otherwise null.
 */
export const findWardBySimilarCode = async (searchCode: string): Promise<Ward | null> => {
    // Extract numbers from the search code to handle inputs like "Ward 6" -> "6"
    const numericPart = searchCode.match(/\\d+/);
    if (!numericPart) {
        console.warn(`[WardQueries] Could not extract numeric part from searchCode: "${searchCode}"`);
        return null;
    }
    const number = numericPart[0];

    // This is less efficient than a direct query, but necessary for case-insensitive/flexible matching
    // without changing the database structure or adding dedicated search services.
    const allWards = await getActiveWards();

    // Create a flexible regex, e.g., for "6", it becomes /ward\\s*6/i
    const searchRegex = new RegExp(`ward\\s*${number}`, 'i');

    const foundWard = allWards.find(ward => ward.wardCode && searchRegex.test(ward.wardCode));

    if (foundWard) {
        console.log(`[WardQueries] Found matching ward (ID: ${foundWard.id}) for search code "${searchCode}"`);
        return foundWard;
    }

    console.warn(`[WardQueries] No ward found matching code "${searchCode}" after flexible search.`);
    return null;
}

// ------------------------------
// Helper – normalize raw Firestore ward data to Ward interface
// ------------------------------

const transformWardDoc = (raw: any, id: string): Ward => {
  return {
    id,
    name: raw.name ?? raw.wardName ?? id,
    wardCode: raw.wardCode ?? raw.code ?? id,
    wardLevel: raw.wardLevel ?? raw.level ?? 1,
    wardOrder: raw.wardOrder ?? raw.order ?? 0,
    isActive: raw.isActive ?? raw.active ?? true,
    totalBeds: raw.totalBeds ?? raw.beds ?? 0,
  };
}; 