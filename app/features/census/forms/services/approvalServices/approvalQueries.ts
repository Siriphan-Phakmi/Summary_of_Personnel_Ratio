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
import { format } from 'date-fns';
import { ApprovalRecord, DailySummary, ApprovalHistoryRecord } from '@/app/core/types/approval';
import { COLLECTION_WARDFORMS, COLLECTION_APPROVALS, COLLECTION_SUMMARIES, COLLECTION_HISTORY } from './index';
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
 * @param filters เงื่อนไขในการค้นหา
 * @returns ข้อมูลสรุปประจำวัน
 */
export const getDailySummaries = async (
  filters: {
    startDate?: Date;
    endDate?: Date;
    wardId?: string;
  } = {}
): Promise<DailySummary[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];
    
    if (filters.startDate) {
      queryConstraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      queryConstraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }
    if (filters.wardId) {
      queryConstraints.push(where('wardId', '==', filters.wardId.toUpperCase()));
    }

    // Order by date descending by default
    queryConstraints.push(orderBy('date', 'desc'));

    // ใช้ safeQuery เพื่อจัดการ index error
    const summaries = await safeQuery<DailySummary>(
      COLLECTION_SUMMARIES, 
      queryConstraints,
      'ApprovalQueries.getDailySummaries'
    );
    
    if (summaries === null) {
      console.warn('[getDailySummaries] Query failed due to missing index. Returning empty array.');
      return [];
    }
    
    return summaries;
    
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    
    // ตรวจสอบว่าเป็น index error หรือไม่
    if (!handleIndexError(error, 'ApprovalQueries.getDailySummaries')) {
      throw error; // ถ้าไม่ใช่ index error ให้ throw error ต่อไป
    }
    
    // ถ้าเป็น index error ให้คืนค่า array ว่าง
    return [];
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