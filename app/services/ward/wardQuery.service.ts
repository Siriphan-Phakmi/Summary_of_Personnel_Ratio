import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  limit as firestoreLimit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { WardFormData, Shift, WardFormFilters } from '@/app/types/ward';
import { format, subDays, parse } from 'date-fns';

// Collection name
const WARD_FORMS_COLLECTION = 'wardForms';

/**
 * Get ward forms for a specific date range
 * @param wardId Ward ID
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of ward forms
 */
export const getWardFormsByDateRange = async (
  wardId: string,
  startDate: string,
  endDate: string
): Promise<WardFormData[]> => {
  try {
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date'),
      orderBy('shift')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WardFormData));
  } catch (error) {
    console.error('Error fetching ward forms by date range:', error);
    throw error;
  }
};

/**
 * Get the most recent night shift form data for a ward
 * @param wardId Ward ID
 * @param date Date (YYYY-MM-DD)
 * @returns Previous night shift data or null
 */
export const getPreviousNightShiftData = async (
  wardId: string,
  date: string
): Promise<WardFormData | null> => {
  try {
    // Convert date string to Date object, then subtract one day
    const dateParts = date.split('-');
    const dateObj = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2])
    );
    dateObj.setDate(dateObj.getDate() - 1);
    
    // Format back to YYYY-MM-DD
    const prevDate = dateObj.toISOString().split('T')[0];
    
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
      where('wardId', '==', wardId),
      where('date', '==', prevDate),
      where('shift', '==', 'night'),
      where('approvalStatus', '==', 'approved'),
      firestoreLimit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as WardFormData;
  } catch (error) {
    console.error('Error fetching previous night shift data:', error);
    throw error;
  }
};

/**
 * Get ward forms with filters and pagination
 * @param filters Filter options
 * @returns Array of ward forms
 */
export const getWardForms = async (filters: {
  wardId?: string;
  userId?: string;
  approvalStatus?: string;
  startDate?: string;
  endDate?: string;
  shift?: Shift | 'all';
  limit?: number;
  lastDoc?: DocumentSnapshot;
}): Promise<{ data: WardFormData[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Add each filter if provided
    if (filters.wardId) {
      constraints.push(where('wardId', '==', filters.wardId));
    }
    
    if (filters.userId) {
      constraints.push(where('createdBy', '==', filters.userId));
    }
    
    if (filters.approvalStatus && filters.approvalStatus !== 'all') {
      constraints.push(where('approvalStatus', '==', filters.approvalStatus));
    }
    
    if (filters.startDate) {
      constraints.push(where('date', '>=', filters.startDate));
    }
    
    if (filters.endDate) {
      constraints.push(where('date', '<=', filters.endDate));
    }
    
    if (filters.shift && filters.shift !== 'all') {
      constraints.push(where('shift', '==', filters.shift));
    }
    
    // Always order by date and shift
    constraints.push(orderBy('date', 'desc'));
    constraints.push(orderBy('shift'));
    
    // Add pagination if lastDoc is provided
    if (filters.lastDoc) {
      constraints.push(startAfter(filters.lastDoc));
    }
    
    // Add limit if provided
    if (filters.limit) {
      constraints.push(firestoreLimit(filters.limit));
    }
    
    const q = query(collection(db, WARD_FORMS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const forms: WardFormData[] = [];
    querySnapshot.forEach((doc) => {
      forms.push({
        id: doc.id,
        ...doc.data()
      } as WardFormData);
    });
    
    // Get the last document for pagination
    const lastDoc = querySnapshot.docs.length > 0 
      ? querySnapshot.docs[querySnapshot.docs.length - 1] 
      : null;
    
    return { 
      data: forms,
      lastDoc
    };
  } catch (error) {
    console.error('Error fetching filtered ward forms:', error);
    throw error;
  }
}; 