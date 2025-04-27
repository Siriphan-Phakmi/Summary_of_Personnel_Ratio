import { collection, query, QueryConstraint, getDocs, Query, DocumentData, FirestoreError } from 'firebase/firestore';
import { db } from './firebase';
import { handleIndexError } from './indexDetector';

/**
 * ทำ Query พร้อมจัดการ Index Error
 * 
 * @param collectionPath path ของ collection ที่ต้องการ query
 * @param constraints constraints ของ query (where, orderBy, limit, etc.)
 * @param context context สำหรับ error handling (เช่น "ApprovalPage" หรือ "WardFormService")
 * @returns ผลลัพธ์ของ query หรือ null ถ้าเกิด error
 */
export async function safeQuery<T = DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[],
  context: string = ''
): Promise<T[] | null> {
  try {
    const q = query(collection(db, collectionPath), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    
  } catch (error: unknown) {
    const firestoreError = error as FirestoreError;
    
    // แจ้งเตือนและจัดการเมื่อเกิด index error
    if (handleIndexError(firestoreError, context)) {
      console.warn(`[${context}] Query requires an index. See console for details.`);
      return null;
    }
    
    // กรณีอื่นๆ โยน error ต่อไป
    throw error;
  }
}

/**
 * ครอบ query object ด้วย try/catch สำหรับ index error
 * ใช้เมื่อต้องการสร้าง query ขั้นสูงที่ซับซ้อนเกินกว่าจะใช้ safeQuery
 * 
 * @param queryFn function ที่สร้าง query
 * @param context context สำหรับ error handling
 * @returns query object
 */
export function createSafeQuery<T = DocumentData>(
  queryFn: () => Query<T>,
  context: string = ''
): Query<T> {
  try {
    return queryFn();
  } catch (error: unknown) {
    const firestoreError = error as FirestoreError;
    
    // แจ้งเตือนและจัดการเมื่อเกิด index error
    if (handleIndexError(firestoreError, context)) {
      console.warn(`[${context}] Query creation requires an index. See console for details.`);
      // สร้าง query ว่างเพื่อไม่ให้โค้ด crash
      return query(collection(db, 'empty_collection')) as unknown as Query<T>;
    }
    
    // กรณีอื่นๆ โยน error ต่อไป
    throw error;
  }
}

export default {
  safeQuery,
  createSafeQuery
}; 