import { collection, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { safeQuery, safeGetDoc } from '@/app/core/firebase/firestoreUtils';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { Logger } from '@/app/core/utils/logger';
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_SUMMARIES 
} from '../constants';

/**
 * ตรวจสอบว่ามี collection dailySummaries ใน Firebase หรือไม่ (พร้อม offline handling)
 */
export const checkDailySummariesCollectionExistsWithOfflineHandling = async (): Promise<boolean> => {
  const context = 'checkDailySummariesCollection';
  
  try {
    Logger.info(`[${context}] Checking if dailySummaries collection exists...`);
    
    const summaries = await safeQuery(
      COLLECTION_SUMMARIES,
      [limit(1)],
      context
    );
    
    const exists = summaries !== null && summaries.length > 0;
    Logger.info(`[${context}] Collection exists: ${exists}`);
    return exists;
    
  } catch (error) {
    Logger.error(`[${context}] Error checking collection:`, error);
    return false;
  }
};

/**
 * ค้นหาฟอร์มล่าสุดที่อนุมัติแล้วสำหรับกะที่ระบุ (พร้อม offline handling)
 * @param dateString วันที่ในรูปแบบ YYYY-MM-DD
 * @param wardId รหัสแผนก
 * @param shift กะที่ต้องการค้นหา ('morning' หรือ 'night')
 * @returns ฟอร์มล่าสุดที่อนุมัติแล้ว หรือ null ถ้าไม่พบ
 */
export const getLastApprovedFormForShiftWithOfflineHandling = async (
  dateString: string,
  wardId: string,
  shift: 'morning' | 'night'
): Promise<WardForm | null> => {
  const context = `getLastApprovedForm-${shift}-${wardId}`;
  
  try {
    Logger.info(`[${context}] Searching for approved ${shift} shift form for ward ${wardId} on ${dateString}`);
    
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('wardId', '==', wardId),
        where('dateString', '==', dateString),
        where('shift', '==', shift),
        where('status', '==', FormStatus.APPROVED),
        orderBy('updatedAt', 'desc'),
        limit(1)
      ],
      context
    );
    
    // ถ้าไม่พบข้อมูล
    if (!forms || forms.length === 0) {
      Logger.info(`[${context}] No approved ${shift} shift form found for ward ${wardId} on ${dateString}`);
      return null;
    }
    
    // ดึงข้อมูลฟอร์มล่าสุด
    const formData = forms[0];
    
    Logger.info(`[${context}] Found approved ${shift} shift form (${formData.id}) for ward ${wardId} on ${dateString}`);
    return formData;
    
  } catch (error) {
    Logger.error(`[${context}] Error fetching ${shift} shift form:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปจาก ID (พร้อม offline handling)
 */
export const getSummaryByIdWithOfflineHandling = async (
  summaryId: string
): Promise<any | null> => {
  const context = `getSummaryById-${summaryId}`;
  
  try {
    Logger.info(`[${context}] Getting summary by ID: ${summaryId}`);
    
    // ใช้ safeGetDoc เพื่อจัดการ offline error
    const summary = await safeGetDoc(
      COLLECTION_SUMMARIES,
      summaryId,
      context
    );
    
    if (summary) {
      Logger.info(`[${context}] Summary found`);
      return summary;
    } else {
      Logger.info(`[${context}] Summary not found`);
      return null;
    }
    
  } catch (error) {
    Logger.error(`[${context}] Error getting summary:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปที่อนุมัติแล้วตามช่วงวันที่ (พร้อม offline handling)
 */
export const getApprovedSummariesByDateRangeWithOfflineHandling = async (
  wardId: string,
  startDateStringForQuery: string,
  endDateStringForQuery: string
): Promise<any[]> => {
  const context = `getApprovedSummaries-${wardId}`;
  
  try {
    Logger.info(`[${context}] Getting approved summaries for ward ${wardId} from ${startDateStringForQuery} to ${endDateStringForQuery}`);
    
    // ใช้ safeQuery เพื่อจัดการ offline error
    const summaries = await safeQuery(
      COLLECTION_SUMMARIES,
      [
        where('wardId', '==', wardId),
        where('dateString', '>=', startDateStringForQuery),
        where('dateString', '<=', endDateStringForQuery),
        orderBy('dateString', 'desc')
      ],
      context
    );
    
    const result = summaries || [];
    Logger.info(`[${context}] Found ${result.length} approved summaries`);
    
    return result;
    
  } catch (error) {
    Logger.error(`[${context}] Error getting approved summaries:`, error);
    throw error;
  }
}; 