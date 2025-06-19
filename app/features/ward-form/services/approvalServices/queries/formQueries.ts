import {
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  getDocs,
  Query
} from 'firebase/firestore';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { format } from 'date-fns';
import { COLLECTION_WARDFORMS } from '../../constants';
import { safeQuery } from '@/app/lib/firebase/firestoreUtils';
import { handleIndexError } from '@/app/lib/firebase/indexDetector';
import { FirestoreError } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';

interface FormFilters {
  startDate?: Date;
  endDate?: Date;
  wardId?: string | string[]; // Allow single or multiple ward IDs
  shift?: ShiftType;
  status?: FormStatus | '';
  createdBy?: string;
}

/**
 * สร้าง Query Constraints สำหรับการค้นหา Forms
 */
const buildFormQueryConstraints = (filters: FormFilters): QueryConstraint[] => {
  const queryConstraints: QueryConstraint[] = [];
  
  // Handling for wardId (string or array of strings)
  if (filters.wardId) {
    if (Array.isArray(filters.wardId) && filters.wardId.length > 0) {
      // Firestore 'in' query supports up to 30 elements.
      // If more are needed, multiple queries would be required.
      // For now, we assume the number of wards per approver is reasonable.
      if (filters.wardId.length > 30) {
        console.warn('Approver has more than 30 wards assigned. Firestore "in" query might fail.');
      }
      queryConstraints.push(where('wardId', 'in', filters.wardId));
    } else if (typeof filters.wardId === 'string') {
      const normalizedWardId = filters.wardId.toUpperCase();
      queryConstraints.push(where('wardId', '==', normalizedWardId));
    }
  }

  if (filters.startDate) {
    queryConstraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
  }
  if (filters.endDate) {
    queryConstraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
  }
  if (filters.shift) {
    queryConstraints.push(where('shift', '==', filters.shift));
  }
  if (typeof filters.status === 'string' && filters.status !== '') {
    queryConstraints.push(where('status', '==', filters.status as FormStatus));
  }
  if (filters.createdBy) {
    queryConstraints.push(where('createdBy', '==', filters.createdBy));
  }
  
  // Add default ordering
  queryConstraints.push(orderBy('date', 'desc'));
  queryConstraints.push(orderBy('shift', 'asc'));
  
  return queryConstraints;
};

/**
 * ค้นหาแบบฟอร์มตามเงื่อนไขต่างๆ
 */
export const getPendingForms = async (filters: FormFilters = {}): Promise<WardForm[]> => {
  try {
    const queryConstraints = buildFormQueryConstraints(filters);
    
    console.log('[getPendingForms] Querying with constraints:', queryConstraints.map(c => c.type));
    
    const formsQuery = query(collection(db, COLLECTION_WARDFORMS), ...queryConstraints) as Query<WardForm>;

    const snapshot = await safeQuery(
      formsQuery,
      'FormQueries.getPendingForms'
    );
    
    if (snapshot === null) {
      console.warn('[getPendingForms] Query failed due to missing index. Returning empty array.');
      return [];
    }

    const forms = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    console.log(`[getPendingForms] Found ${forms.length} documents.`);
    return forms;
    
  } catch (error) {
    console.error('Error fetching pending forms:', error);
    
    if (!handleIndexError(error as FirestoreError, 'FormQueries.getPendingForms')) {
      throw error;
    }
    
    return [];
  }
};

/**
 * ค้นหาแบบฟอร์มที่อนุมัติแล้ว
 */
export const getApprovedForms = async (
  filters: Omit<FormFilters, 'status' | 'createdBy'> = {}
): Promise<WardForm[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [
      where('status', '==', 'approved')
    ];
    
    if (filters.wardId) {
      queryConstraints.push(where('wardId', '==', filters.wardId));
    }
    
    if (filters.shift) {
      queryConstraints.push(where('shift', '==', filters.shift));
    }
    
    if (filters.startDate && filters.endDate) {
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
    
    queryConstraints.push(orderBy('dateString', 'desc'));
    queryConstraints.push(orderBy('shift', 'asc'));
    
    const formsQuery = query(collection(db, COLLECTION_WARDFORMS), ...queryConstraints) as Query<WardForm>;
    
    const snapshot = await safeQuery(
      formsQuery,
      'FormQueries.getApprovedForms'
    );
    
    if (snapshot === null) {
      console.warn('[getApprovedForms] Query failed due to missing index. Returning empty array.');
      return [];
    }
    
    const forms = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return forms;
    
  } catch (error) {
    console.error('Error fetching approved forms:', error);
    
    if (!handleIndexError(error as FirestoreError, 'FormQueries.getApprovedForms')) {
      throw error;
    }
    
    return [];
  }
};

export type { FormFilters }; 