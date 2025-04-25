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
  } = {}
): Promise<WardForm[]> => {
  try {
    const wardFormsRef = collection(db, COLLECTION_WARDFORMS);
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
    
    // Add default ordering
    queryConstraints.push(orderBy('date', 'desc'));
    queryConstraints.push(orderBy('shift', 'asc'));
    
    console.log('[getPendingForms] Querying with constraints:', queryConstraints.map(c => c.type));
    
    const q = query(wardFormsRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    console.log(`[getPendingForms] Found ${querySnapshot.size} documents.`);

    const forms: WardForm[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<WardForm, 'id'>;
      forms.push({ ...data, id: doc.id });
    });

    return forms;
  } catch (error) {
    console.error('Error fetching pending forms:', error);
    throw error;
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
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    
    // สร้าง conditions สำหรับค้นหา
    // ใช้ค่า string โดยตรงเพราะข้อมูลใน DB เป็น lowercase
    const conditions = [where('status', '==', 'approved')]; // Use lowercase string 'approved'
    
    // เพิ่มเงื่อนไขตามที่ระบุ
    if (filters.wardId) {
      conditions.push(where('wardId', '==', filters.wardId));
    }
    
    if (filters.shift) {
      conditions.push(where('shift', '==', filters.shift));
    }
    
    if (filters.startDate && filters.endDate) {
      // แปลงวันที่เป็น string สำหรับค้นหา
      const startDateString = format(filters.startDate, 'yyyy-MM-dd');
      const endDateString = format(filters.endDate, 'yyyy-MM-dd');
      
      conditions.push(where('dateString', '>=', startDateString));
      conditions.push(where('dateString', '<=', endDateString));
    } else if (filters.startDate) {
      const startDateString = format(filters.startDate, 'yyyy-MM-dd');
      conditions.push(where('dateString', '>=', startDateString));
    } else if (filters.endDate) {
      const endDateString = format(filters.endDate, 'yyyy-MM-dd');
      conditions.push(where('dateString', '<=', endDateString));
    }
    
    // สร้าง query
    const formsQuery = query(
      formsRef,
      ...conditions,
      orderBy('dateString', 'desc'),
      orderBy('shift', 'asc')
    );
    
    const formDocs = await getDocs(formsQuery);
    
    // แปลงข้อมูลเอกสารเป็น objects
    const forms: WardForm[] = formDocs.docs.map(doc => ({
      ...(doc.data() as WardForm),
      id: doc.id
    }));
    
    return forms;
  } catch (error) {
    console.error('Error fetching approved forms:', error);
    throw error;
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
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
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

    const q = query(summariesRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    const summaries: DailySummary[] = [];
    querySnapshot.forEach((doc) => {
      summaries.push({ ...(doc.data() as DailySummary), id: doc.id });
    });
    
    return summaries;
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    throw error;
  }
};

/**
 * ดึงประวัติการอนุมัติของแบบฟอร์ม
 * @param formId รหัสแบบฟอร์ม
 * @returns ข้อมูลประวัติการอนุมัติ
 */
export const getApprovalHistory = async (formId: string): Promise<ApprovalRecord[]> => {
  try {
    const approvalsRef = collection(db, COLLECTION_APPROVALS);
    const approvalsQuery = query(
      approvalsRef,
      where('formId', '==', formId),
      orderBy('approvedAt', 'desc')
    );
    
    const approvalDocs = await getDocs(approvalsQuery);
    
    if (approvalDocs.empty) {
      return [];
    }
    
    // แปลงข้อมูลเอกสารเป็น objects
    const approvals: ApprovalRecord[] = approvalDocs.docs.map(doc => ({
      ...(doc.data() as ApprovalRecord),
      id: doc.id
    }));
    
    return approvals;
  } catch (error) {
    console.error('Error fetching approval history:', error);
    throw error;
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