import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { format } from 'date-fns';
import { ApprovalRecord, DailySummary } from '@/app/core/types/approval';
import { COLLECTION_WARDFORMS, COLLECTION_APPROVALS, COLLECTION_SUMMARIES } from './index';

/**
 * ค้นหาแบบฟอร์มที่รอการอนุมัติ
 * @param filters เงื่อนไขในการค้นหา
 * @returns แบบฟอร์มที่รอการอนุมัติ
 */
export const getPendingForms = async (
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
    const conditions = [where('status', '==', FormStatus.FINAL)];
    
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
    const conditions = [where('status', '==', FormStatus.APPROVED)];
    
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
    
    // สร้าง conditions สำหรับค้นหา
    const conditions: any[] = [];
    
    // เพิ่มเงื่อนไขตามที่ระบุ
    if (filters.wardId) {
      conditions.push(where('wardId', '==', filters.wardId));
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
    const summariesQuery = query(
      summariesRef,
      ...conditions,
      orderBy('dateString', 'desc')
    );
    
    const summaryDocs = await getDocs(summariesQuery);
    
    // แปลงข้อมูลเอกสารเป็น objects
    const summaries: DailySummary[] = summaryDocs.docs.map(doc => ({
      ...(doc.data() as DailySummary),
      id: doc.id
    }));
    
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