import {
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  FirestoreError,
  collection,
  Query
} from 'firebase/firestore';
import { DailySummary } from '@/app/features/ward-form/types/approval';
import { startOfDay, endOfDay } from 'date-fns';
import { COLLECTION_SUMMARIES } from '../../constants';
import { safeQuery } from '@/app/lib/firebase/firestoreUtils';
import { handleIndexError } from '@/app/lib/firebase/indexDetector';
import { db } from '@/app/lib/firebase/firebase';

interface SummaryFilters {
  startDate?: Date;
  endDate?: Date;
  wardId?: string;
  approvedOnly?: boolean;
}

/**
 * สร้าง Query Constraints สำหรับการค้นหา Daily Summaries
 */
const buildSummaryQueryConstraints = (filters: SummaryFilters): QueryConstraint[] => {
  const queryConstraints: QueryConstraint[] = [];
  
  // วันที่เริ่มต้น
  if (filters.startDate && filters.startDate instanceof Date && !isNaN(filters.startDate.getTime())) {
    const startDate = startOfDay(filters.startDate);
    console.log(`[buildSummaryQueryConstraints] Using startDate: ${startDate.toISOString()}`);
    queryConstraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
  }
  
  // วันที่สิ้นสุด
  if (filters.endDate && filters.endDate instanceof Date && !isNaN(filters.endDate.getTime())) {
    const endDate = endOfDay(filters.endDate);
    console.log(`[buildSummaryQueryConstraints] Using endDate: ${endDate.toISOString()}`);
    queryConstraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
  }
  
  // แผนก
  if (filters.wardId) {
    queryConstraints.push(where('wardId', '==', filters.wardId));
  }
  
  // เฉพาะที่อนุมัติแล้ว
  if (filters.approvedOnly) {
    queryConstraints.push(where('isApproved', '==', true));
  }
  
  // เรียงลำดับ
  queryConstraints.push(orderBy('date', 'desc'));
  
  return queryConstraints;
};

/**
 * ค้นหาข้อมูลสรุปประจำวัน
 */
export const getDailySummaries = async (filters: SummaryFilters = {}): Promise<DailySummary[]> => {
  try {
    const queryConstraints = buildSummaryQueryConstraints(filters);
    
    console.log('[getDailySummaries] Querying with constraints:', queryConstraints.map(c => c.type));
    
    const summariesQuery = query(collection(db, COLLECTION_SUMMARIES), ...queryConstraints) as Query<DailySummary>;

    const snapshot = await safeQuery(
      summariesQuery,
      'SummaryQueries.getDailySummaries'
    );
    
    if (snapshot === null) {
      console.warn('[getDailySummaries] Query failed due to missing index. Returning empty array.');
      return [];
    }
    
    const summaries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    console.log(`[getDailySummaries] Found ${summaries.length} summaries.`);
    return summaries;
    
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    
    if (!handleIndexError(error as FirestoreError, 'SummaryQueries.getDailySummaries')) {
      throw error;
    }
    
    return [];
  }
};

export type { SummaryFilters }; 