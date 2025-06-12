import { 
  collection, 
  query, 
  QueryConstraint, 
  getDocs, 
  getDoc,
  doc,
  Query, 
  DocumentData, 
  FirestoreError,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { handleIndexError } from './indexDetector';
import { Logger } from '@/app/core/utils/logger';

/**
 * Firestore utility functions with offline error handling
 */

/**
 * ตรวจสอบว่า error เป็น offline error หรือไม่
 */
const isOfflineError = (error: any): boolean => {
  if (error?.code) {
    return error.code === 'unavailable' || 
           error.code === 'failed-precondition' ||
           error.message?.includes('offline') ||
           error.message?.includes('client is offline');
  }
  return false;
};

/**
 * แสดง error message ที่เหมาะสม
 */
const getErrorMessage = (error: any, context: string): string => {
  if (isOfflineError(error)) {
    return `ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต (${context})`;
  }
  return `เกิดข้อผิดพลาดในการเข้าถึงข้อมูล: ${error.message} (${context})`;
};

/**
 * หน่วงเวลาก่อน retry
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * ทำ Query พร้อมจัดการ Index Error และ Offline Error
 * 
 * @param collectionPath path ของ collection ที่ต้องการ query
 * @param constraints constraints ของ query (where, orderBy, limit, etc.)
 * @param context context สำหรับ error handling (เช่น "ApprovalPage" หรือ "WardFormService")
 * @param retryCount จำนวนครั้งที่จะ retry เมื่อเกิด offline error (default: 3)
 * @returns ผลลัพธ์ของ query หรือ null ถ้าเกิด error
 */
export async function safeQuery<T = DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[],
  context: string = '',
  retryCount: number = 3
): Promise<T[] | null> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      Logger.info(`[safeQuery-${context}] Attempt ${attempt}/${retryCount} for collection: ${collectionPath}`);
      
      const q = query(collection(db, collectionPath), ...constraints);
      const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
      
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
      
      Logger.info(`[safeQuery-${context}] Success! Retrieved ${results.length} documents`);
      return results;
      
    } catch (error: any) {
      lastError = error;
      Logger.error(`[safeQuery-${context}] Attempt ${attempt}/${retryCount} failed:`, error);
      
      // ถ้าเป็น index error ให้จัดการ
      if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
        Logger.info(`[safeQuery-${context}] Handling index error...`);
        handleIndexError(error, context);
        return null; // Return null สำหรับ index error
      }
      
      // ถ้าเป็น offline error และยังมี retry ที่เหลือ
      if (isOfflineError(error) && attempt < retryCount) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        Logger.info(`[safeQuery-${context}] Offline error detected, retrying in ${delayMs}ms...`);
        await delay(delayMs);
        continue;
      }
      
      // ถ้าไม่ใช่ offline error หรือ retry หมดแล้ว ให้ throw error
      if (!isOfflineError(error) || attempt === retryCount) {
        const message = getErrorMessage(error, context);
        Logger.error(`[safeQuery-${context}] Final failure:`, message);
        throw error;
      }
    }
  }
  
  // ถ้าถึงจุดนี้แสดงว่า retry หมดแล้วและเป็น offline error
  const message = getErrorMessage(lastError, context);
  Logger.error(`[safeQuery-${context}] All retries exhausted:`, message);
  throw lastError;
}

/**
 * ดึงเอกสารเดียวพร้อมจัดการ Offline Error
 * 
 * @param collectionPath path ของ collection
 * @param documentId ID ของเอกสารที่ต้องการ
 * @param context context สำหรับ error handling
 * @param retryCount จำนวนครั้งที่จะ retry เมื่อเกิด offline error (default: 3)
 * @returns ข้อมูลเอกสาร หรือ null ถ้าไม่พบหรือเกิด error
 */
export async function safeGetDoc<T = DocumentData>(
  collectionPath: string,
  documentId: string,
  context: string = '',
  retryCount: number = 3
): Promise<T | null> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      Logger.info(`[safeGetDoc-${context}] Attempt ${attempt}/${retryCount} for doc: ${collectionPath}/${documentId}`);
      
      const docRef = doc(db, collectionPath, documentId);
      const docSnap: DocumentSnapshot<DocumentData> = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const result = { id: docSnap.id, ...docSnap.data() } as T;
        Logger.info(`[safeGetDoc-${context}] Success! Retrieved document`);
        return result;
      } else {
        Logger.info(`[safeGetDoc-${context}] Document not found`);
        return null;
      }
      
    } catch (error: any) {
      lastError = error;
      Logger.error(`[safeGetDoc-${context}] Attempt ${attempt}/${retryCount} failed:`, error);
      
      // ถ้าเป็น offline error และยังมี retry ที่เหลือ
      if (isOfflineError(error) && attempt < retryCount) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        Logger.info(`[safeGetDoc-${context}] Offline error detected, retrying in ${delayMs}ms...`);
        await delay(delayMs);
        continue;
      }
      
      // ถ้าไม่ใช่ offline error หรือ retry หมดแล้ว ให้ throw error
      if (!isOfflineError(error) || attempt === retryCount) {
        const message = getErrorMessage(error, context);
        Logger.error(`[safeGetDoc-${context}] Final failure:`, message);
        throw error;
      }
    }
  }
  
  // ถ้าถึงจุดนี้แสดงว่า retry หมดแล้วและเป็น offline error
  const message = getErrorMessage(lastError, context);
  Logger.error(`[safeGetDoc-${context}] All retries exhausted:`, message);
  throw lastError;
}

/**
 * ตรวจสอบสถานะการเชื่อมต่อ Firestore
 */
export async function checkFirestoreConnection(context: string = ''): Promise<boolean> {
  try {
    // ลองอ่าน collection ธรรมดาเพื่อทดสอบการเชื่อมต่อ
    const testQuery = query(collection(db, 'wards'), /* limit(1) */);
    await getDocs(testQuery);
    Logger.info(`[checkFirestoreConnection-${context}] Connection is healthy`);
    return true;
  } catch (error: any) {
    Logger.error(`[checkFirestoreConnection-${context}] Connection failed:`, error);
    return false;
  }
}

/**
 * รอให้การเชื่อมต่อกลับมาปกติ
 */
export async function waitForConnection(
  maxWaitTime: number = 10000,
  context: string = ''
): Promise<boolean> {
  const startTime = Date.now();
  let attempt = 1;
  
  while (Date.now() - startTime < maxWaitTime) {
    Logger.info(`[waitForConnection-${context}] Checking connection attempt ${attempt}...`);
    
    if (await checkFirestoreConnection(context)) {
      Logger.info(`[waitForConnection-${context}] Connection restored after ${Date.now() - startTime}ms`);
      return true;
    }
    
    await delay(1000);
    attempt++;
  }
  
  Logger.error(`[waitForConnection-${context}] Connection timeout after ${maxWaitTime}ms`);
  return false;
}

export default {
  safeQuery,
  safeGetDoc,
  checkFirestoreConnection,
  waitForConnection
}; 