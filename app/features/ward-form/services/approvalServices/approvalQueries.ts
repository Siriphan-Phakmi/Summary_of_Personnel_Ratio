// Re-export queries from modular files to maintain backward compatibility
// This file serves as an entry point for all approval-related queries

// Form queries
export {
  getPendingForms,
  getApprovedForms,
  type FormFilters
} from './queries/formQueries';

// Summary queries  
export {
  getDailySummaries,
  type SummaryFilters
} from './queries/summaryQueries';

// Keep existing specific functions that don't belong in the modular files
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  collection,
  limit
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { ApprovalRecord, ApprovalHistoryRecord } from '@/app/features/ward-form/types/approval';
import { 
  COLLECTION_APPROVALS, 
  COLLECTION_HISTORY 
} from '../constants';

/**
 * ดึงประวัติการอนุมัติของฟอร์ม
 */
export const getApprovalHistory = async (formId: string): Promise<ApprovalRecord[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_APPROVALS),
      where('formId', '==', formId),
      orderBy('approvedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const approvals: ApprovalRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      approvals.push({
        id: doc.id,
        ...doc.data()
      } as ApprovalRecord);
    });
    
    return approvals;
  } catch (error) {
    console.error('Error fetching approval history:', error);
    return [];
  }
};

/**
 * ดึงประวัติการอนุมัติแบบละเอียด
 */
export const getApprovalHistoryByFormId = async (formId: string): Promise<ApprovalHistoryRecord[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_HISTORY),
      where('formId', '==', formId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const history: ApprovalHistoryRecord[] = [];
    
    querySnapshot.forEach((doc) => {
       history.push({ 
         ...doc.data() as ApprovalHistoryRecord, 
         id: doc.id 
       });
    });

    return history;
  } catch (error) {
    console.error('Error fetching approval history by form ID:', error);
    return [];
  }
}; 