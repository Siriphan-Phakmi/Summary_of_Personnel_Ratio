import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ApprovalRecord, DailySummary, ApprovalHistoryRecord } from '@/app/core/types/approval';
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_APPROVALS, 
  COLLECTION_SUMMARIES, 
  COLLECTION_HISTORY 
} from '../constants';
import { safeQuery } from '@/app/core/firebase/firestoreUtils';
import { handleIndexError } from '@/app/core/firebase/indexDetector';

/**
 * ค้นหาแบบฟอร์มตามเงื่อนไขต่างๆ (รองรับ status filter)
 * @param filters เงื่อนไขในการค้นหา
 * @returns แบบฟอร์มที่ตรงตามเงื่อนไข
 */
export const getPendingForms = async (
  filters: {
    startDate?: Date;
    endDate?: Date;
    wardId?: string;
    shift?: ShiftType;
    status?: FormStatus | '';
    createdBy?: string;
  } = {}
): Promise<WardForm[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];
    
    // Normalize wardId to uppercase if provided
    const normalizedWardId = filters.wardId?.toUpperCase();

    if (filters.startDate) {
      queryConstraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      queryConstraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }
    if (normalizedWardId) {
      queryConstraints.push(where('wardId', '==', normalizedWardId));
    }
    if (filters.shift) {
      queryConstraints.push(where('shift', '==', filters.shift));
    }
    // Handle status filter: only add if status is provided and not an empty string
    if (typeof filters.status === 'string' && filters.status !== '') {
      queryConstraints.push(where('status', '==', filters.status as FormStatus));
    }
    
    // เพิ่มการกรองตาม createdBy ถ้ามีการส่งค่ามา
    if (filters.createdBy) {
      queryConstraints.push(where('createdBy', '==', filters.createdBy));
    }
    
    // Add default ordering
    queryConstraints.push(orderBy('date', 'desc'));
    queryConstraints.push(orderBy('shift', 'asc'));
    
    console.log('[getPendingForms] Querying with constraints:', queryConstraints.map(c => c.type));
    
    // ใช้ safeQuery เพื่อจัดการ index error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS, 
      queryConstraints,
      'ApprovalQueries.getPendingForms'
    );
    
    if (forms === null) {
      console.warn('[getPendingForms] Query failed due to missing index. Returning empty array.');
      return [];
    }

    console.log(`[getPendingForms] Found ${forms.length} documents.`);
    return forms;
    
  } catch (error) {
    console.error('Error fetching pending forms:', error);
    
    // ตรวจสอบว่าเป็น index error หรือไม่
    if (!handleIndexError(error, 'ApprovalQueries.getPendingForms')) {
      throw error; // ถ้าไม่ใช่ index error ให้ throw error ต่อไป
    }
    
    // ถ้าเป็น index error ให้คืนค่า array ว่าง
    return [];
  }
};

/**
 * ค้นหาแบบฟอร์มที่อนุมัติแล้ว
 * @param filters เงื่อนไขในการค้นหา
 * @returns แบบฟอร์มที่อนุมัติแล้ว
 */
export const getApprovedForms = async (
  filters: {
    startDate?: Date;
    endDate?: Date;
    wardId?: string;
    shift?: ShiftType;
  } = {}
): Promise<WardForm[]> => {
  try {
    // สร้าง conditions สำหรับค้นหา
    const queryConstraints: QueryConstraint[] = [
      where('status', '==', 'approved') // Use lowercase string 'approved'
    ];
    
    // เพิ่มเงื่อนไขตามที่ระบุ
    if (filters.wardId) {
      queryConstraints.push(where('wardId', '==', filters.wardId));
    }
    
    if (filters.shift) {
      queryConstraints.push(where('shift', '==', filters.shift));
    }
    
    if (filters.startDate && filters.endDate) {
      // แปลงวันที่เป็น string สำหรับค้นหา
      const startDateString = format(filters.startDate, 'yyyy-MM-dd');
      const endDateString = format(filters.endDate, 'yyyy-MM-dd');
      
      queryConstraints.push(where('dateString', '>=', startDateString));
      queryConstraints.push(where('dateString', '<=', endDateString));
    } else if (filters.startDate) {
      const startDateString = format(filters.startDate, 'yyyy-MM-dd');
      queryConstraints.push(where('dateString', '>=', startDateString));
    } else if (filters.endDate) {
      const endDateString = format(filters.endDate, 'yyyy-MM-dd');
      queryConstraints.push(where('dateString', '<=', endDateString));
    }
    
    // เพิ่ม ordering
    queryConstraints.push(orderBy('dateString', 'desc'));
    queryConstraints.push(orderBy('shift', 'asc'));
    
    // ใช้ safeQuery เพื่อจัดการ index error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS, 
      queryConstraints,
      'ApprovalQueries.getApprovedForms'
    );
    
    if (forms === null) {
      console.warn('[getApprovedForms] Query failed due to missing index. Returning empty array.');
      return [];
    }
    
    return forms;
    
  } catch (error) {
    console.error('Error fetching approved forms:', error);
    
    // ตรวจสอบว่าเป็น index error หรือไม่
    if (!handleIndexError(error, 'ApprovalQueries.getApprovedForms')) {
      throw error; // ถ้าไม่ใช่ index error ให้ throw error ต่อไป
    }
    
    // ถ้าเป็น index error ให้คืนค่า array ว่าง
    return [];
  }
};

/**
 * ค้นหาข้อมูลสรุปประจำวัน
 * @param filters เงื่อนไขในการค้นหา (รวมถึง approvedOnly)
 * @returns ข้อมูลสรุปประจำวัน
 */
export const getDailySummaries = async (
  filters: {
    startDate?: Date;
    endDate?: Date;
    wardId?: string;
    approvedOnly?: boolean;
  } = {}
): Promise<DailySummary[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];
    
    // ตรวจสอบและแปลงวันที่ให้ถูกต้อง
    if (filters.startDate && filters.startDate instanceof Date && !isNaN(filters.startDate.getTime())) {
      const startDate = startOfDay(filters.startDate); // ใช้ 00:00:00
      console.log(`[getDailySummaries] Using startDate: ${startDate.toISOString()}`);
      queryConstraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
    }
    
    if (filters.endDate && filters.endDate instanceof Date && !isNaN(filters.endDate.getTime())) {
      const endDate = endOfDay(filters.endDate); // ใช้ 23:59:59
      console.log(`[getDailySummaries] Using endDate: ${endDate.toISOString()}`);
      queryConstraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
    }
    
    // ตรวจสอบ wardId
    if (filters.wardId && typeof filters.wardId === 'string' && filters.wardId.trim() !== '') {
      console.log(`[getDailySummaries] Using wardId: ${filters.wardId}`);
      queryConstraints.push(where('wardId', '==', filters.wardId));
    } else {
      console.warn(`[getDailySummaries] Invalid or missing wardId: ${filters.wardId}`);
      return []; // คืนค่าอาร์เรย์ว่างเมื่อไม่มี wardId ที่ถูกต้อง
    }
    
    // เพิ่มเงื่อนไขสำหรับ approvedOnly
    if (filters.approvedOnly === true) {
      console.log(`[getDailySummaries] Filtering by approved only`);
      queryConstraints.push(where('allFormsApproved', '==', true));
    }

    // ถ้าไม่มี query constraints จะได้ข้อมูลทั้งหมด ซึ่งอาจจะเยอะเกินไป
    if (queryConstraints.length <= 1) { // ต้องมีมากกว่าเพียงแค่ wardId
      console.warn('[getDailySummaries] Too few query constraints provided, this might return too much data');
      // เพิ่มข้อจำกัดเพื่อป้องกันการดึงข้อมูลมากเกินไป
      queryConstraints.push(limit(50));
    }

    // Order by date
    queryConstraints.push(orderBy('date', 'desc'));

    // บันทึก query ที่จะใช้เพื่อ debug
    console.log(`[getDailySummaries] Query constraints length: ${queryConstraints.length}`);

    try {
    // ใช้ safeQuery เพื่อจัดการ index error
    const summaries = await safeQuery<DailySummary>(
      COLLECTION_SUMMARIES, 
      queryConstraints,
      'ApprovalQueries.getDailySummaries'
    );
    
    if (summaries === null) {
        console.warn('[getDailySummaries] Primary query failed due to missing index. Trying fallback method...');
        
        // ถ้า safeQuery ล้มเหลว ให้ลองใช้การดึงข้อมูลทั้งหมดแล้วกรองในหน่วยความจำ
        const basicQuery = query(
          collection(db, COLLECTION_SUMMARIES),
          where('wardId', '==', filters.wardId)
        );
        
        const querySnapshot = await getDocs(basicQuery);
        console.log(`[getDailySummaries] Fallback found ${querySnapshot.size} documents`);
        
        // กรองข้อมูลในหน่วยความจำ
        let filteredResults = querySnapshot.docs.map(doc => ({
          ...doc.data() as DailySummary,
          id: doc.id
        }));
        
        // กรองตามช่วงวันที่
        if (filters.startDate) {
          const startDate = startOfDay(filters.startDate);
          filteredResults = filteredResults.filter(summary => {
            if (!summary.date) return false;
            
            const summaryDate = summary.date instanceof Timestamp 
              ? summary.date.toDate() 
              : new Date(summary.date);
              
            return summaryDate >= startDate;
          });
        }
        
        if (filters.endDate) {
          const endDate = endOfDay(filters.endDate);
          filteredResults = filteredResults.filter(summary => {
            if (!summary.date) return false;
            
            const summaryDate = summary.date instanceof Timestamp 
              ? summary.date.toDate() 
              : new Date(summary.date);
              
            return summaryDate <= endDate;
          });
        }
        
        // กรองตาม approvedOnly
        if (filters.approvedOnly === true) {
          filteredResults = filteredResults.filter(summary => summary.allFormsApproved === true);
        }
        
        console.log(`[getDailySummaries] Manually filtered to ${filteredResults.length} documents`);
        
        // เรียงลำดับตามวันที่
        filteredResults.sort((a, b) => {
          const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
          const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        // ตรวจสอบผลลัพธ์
        filteredResults.forEach((summary, index) => {
          if (index < 5) { // แสดงเฉพาะ 5 รายการแรกเพื่อไม่ให้ log เยอะเกินไป
            console.log(`[getDailySummaries] Result ${index}: ${summary.id}, Date: ${summary.dateString}, Morning: ${!!summary.morningFormId}, Night: ${!!summary.nightFormId}, AllApproved: ${summary.allFormsApproved}`);
          }
        });
        
        return filteredResults;
      }
      
      console.log(`[getDailySummaries] Found ${summaries.length} summaries`);
      
      // ตรวจสอบ summaries ที่ได้
      summaries.forEach((summary, index) => {
        if (index < 5) { // แสดงเฉพาะ 5 รายการแรกเพื่อไม่ให้ log เยอะเกินไป
          console.log(`[getDailySummaries] Summary ${index}: ${summary.id}, Date: ${summary.dateString}, Morning: ${!!summary.morningFormId}, Night: ${!!summary.nightFormId}, AllApproved: ${summary.allFormsApproved}`);
        }
      });
    
    return summaries;
    } catch (error) {
      console.error('[getDailySummaries] Error executing query:', error);
      
      // ในกรณีที่มี error ที่ไม่ได้จัดการโดย safeQuery ให้ลองใช้วิธีอื่น
      console.log('[getDailySummaries] Attempting alternative query method...');
      
      // ใช้ collection query แบบพื้นฐานที่สุด
      const basicQuery = query(
        collection(db, COLLECTION_SUMMARIES),
        where('wardId', '==', filters.wardId)
      );
      
      const querySnapshot = await getDocs(basicQuery);
      const allSummaries = querySnapshot.docs.map(doc => ({
        ...doc.data() as DailySummary,
        id: doc.id
      }));
      
      console.log(`[getDailySummaries] Basic query found ${allSummaries.length} documents`);
      
      // กรองข้อมูลในหน่วยความจำตามเงื่อนไขอื่นๆ
      let filteredSummaries = [...allSummaries];
      
      // กรองตามวันที่
      if (filters.startDate) {
        const startDate = startOfDay(filters.startDate);
        filteredSummaries = filteredSummaries.filter(summary => {
          const summaryDate = summary.date instanceof Timestamp ? summary.date.toDate() : new Date(summary.date);
          return summaryDate >= startDate;
        });
      }
      
      if (filters.endDate) {
        const endDate = endOfDay(filters.endDate);
        filteredSummaries = filteredSummaries.filter(summary => {
          const summaryDate = summary.date instanceof Timestamp ? summary.date.toDate() : new Date(summary.date);
          return summaryDate <= endDate;
        });
      }
      
      // กรองตาม approved status
      if (filters.approvedOnly === true) {
        filteredSummaries = filteredSummaries.filter(summary => summary.allFormsApproved === true);
      }
      
      console.log(`[getDailySummaries] Alternative method filtered to ${filteredSummaries.length} documents`);
      
      // เรียงลำดับตามวันที่
      filteredSummaries.sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      return filteredSummaries;
    }
    
  } catch (error) {
    console.error('[getDailySummaries] Error fetching daily summaries:', error);
    
    // ตรวจสอบว่าเป็น index error หรือไม่ และจัดการตามนั้น
    if (!handleIndexError(error, 'ApprovalQueries.getDailySummaries')) {
      console.error('[getDailySummaries] Unhandled error:', error);
    }
    return []; // คืนค่า array ว่างเสมอเมื่อเกิด error เพื่อป้องกันหน้าแอปพัง
  }
};

/**
 * ดึงประวัติการอนุมัติของแบบฟอร์ม
 * @param formId รหัสแบบฟอร์ม
 * @returns ข้อมูลประวัติการอนุมัติ
 */
export const getApprovalHistory = async (formId: string): Promise<ApprovalRecord[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [
      where('formId', '==', formId),
      orderBy('approvedAt', 'desc')
    ];
    
    // ใช้ safeQuery เพื่อจัดการ index error
    const approvals = await safeQuery<ApprovalRecord>(
      COLLECTION_APPROVALS, 
      queryConstraints,
      'ApprovalQueries.getApprovalHistory'
    );
    
    if (approvals === null) {
      console.warn('[getApprovalHistory] Query failed due to missing index. Returning empty array.');
      return [];
    }
    
    return approvals;
    
  } catch (error) {
    console.error('Error fetching approval history:', error);
    
    // ตรวจสอบว่าเป็น index error หรือไม่
    if (!handleIndexError(error, 'ApprovalQueries.getApprovalHistory')) {
      throw error; // ถ้าไม่ใช่ index error ให้ throw error ต่อไป
    }
    
    // ถ้าเป็น index error ให้คืนค่า array ว่าง
    return [];
  }
};

/**
 * ดึงประวัติการอนุมัติ/ปฏิเสธของแบบฟอร์มที่ระบุ
 * @param formId รหัสของ WardForm
 * @returns รายการประวัติ เรียงตามเวลาล่าสุดก่อน
 */
export const getApprovalHistoryByFormId = async (formId: string): Promise<ApprovalHistoryRecord[]> => {
  if (!formId) {
    console.warn('[getApprovalHistoryByFormId] formId is required.');
    return [];
  }
  try {
    const historyRef = collection(db, COLLECTION_HISTORY);
    const q = query(
      historyRef,
      where('formId', '==', formId),
      orderBy('timestamp', 'desc') // เรียงตามเวลาล่าสุดขึ้นก่อน
    );

    const querySnapshot = await getDocs(q);
    const history: ApprovalHistoryRecord[] = [];
    querySnapshot.forEach((doc) => {
      history.push({ ...(doc.data() as ApprovalHistoryRecord), id: doc.id });
    });

    return history;
  } catch (error) {
    console.error(`Error fetching approval history for form ${formId}:`, error);
    throw error;
  }
}; 