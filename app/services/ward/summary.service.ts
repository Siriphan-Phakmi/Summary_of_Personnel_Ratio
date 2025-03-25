import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { DailySummary, DaySummaryData } from '@/app/types/ward';

// Collection names
const DAILY_SUMMARIES_COLLECTION = 'dailySummaries';
const DAY_SUMMARIES_COLLECTION = 'daySummaries';

/**
 * Save day summary data
 * @param summaryData Summary data
 * @returns Summary ID
 */
export const saveDaySummary = async (
  summaryData: DaySummaryData
): Promise<string> => {
  try {
    // Check if a summary already exists for this ward and date
    const existingSummary = await getDaySummary(summaryData.wardId, summaryData.date);
    
    if (existingSummary) {
      // Update existing summary
      const summaryRef = doc(db, DAY_SUMMARIES_COLLECTION, existingSummary.id || '');
      
      await updateDoc(summaryRef, {
        ...summaryData,
        updatedAt: serverTimestamp(),
      });
      
      return existingSummary.id || '';
    } else {
      // Create new summary
      const docRef = await addDoc(collection(db, DAY_SUMMARIES_COLLECTION), {
        ...summaryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving day summary:', error);
    throw error;
  }
};

/**
 * Get day summary for a specific ward and date
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @returns Day summary data or null if not found
 */
export const getDaySummary = async (
  wardId: string,
  date: string
): Promise<DaySummaryData | null> => {
  try {
    const summariesRef = collection(db, DAY_SUMMARIES_COLLECTION);
    const q = query(
      summariesRef,
      where('wardId', '==', wardId),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as DaySummaryData;
  } catch (error) {
    console.error('Error getting day summary:', error);
    throw error;
  }
};

/**
 * Save daily summary
 * @param summaryData Daily summary data
 * @param summaryId Optional ID for updating existing summary
 * @returns Summary ID
 */
export const saveDailySummary = async (
  summaryData: DailySummary,
  summaryId?: string
): Promise<string> => {
  try {
    if (summaryId) {
      // Update existing summary
      const summaryRef = doc(db, DAILY_SUMMARIES_COLLECTION, summaryId);
      
      await updateDoc(summaryRef, {
        ...summaryData,
        updatedAt: serverTimestamp(),
      });
      
      return summaryId || '';
    } else {
      // Create new summary
      const docRef = await addDoc(collection(db, DAILY_SUMMARIES_COLLECTION), {
        ...summaryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving daily summary:', error);
    throw error;
  }
};

/**
 * Get daily summary by date
 * @param date Date in YYYY-MM-DD format
 * @returns Daily summary data or null if not found
 */
export const getDailySummaryByDate = async (
  date: string
): Promise<DailySummary | null> => {
  try {
    const summariesRef = collection(db, DAILY_SUMMARIES_COLLECTION);
    const q = query(
      summariesRef,
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id || '',
      ...doc.data(),
    } as DailySummary;
  } catch (error) {
    console.error('Error getting daily summary by date:', error);
    throw error;
  }
};

/**
 * Update daily summary
 * @param date Date in YYYY-MM-DD format
 * @param data Summary data to update
 */
export const updateDailySummary = async (
  date: string,
  data: {
    opd24hr: number;
    oldPatient: number;
    newPatient: number;
    admit24hr: number;
    supervisorFirstName: string;
    supervisorLastName: string;
    supervisorId: string;
  }
): Promise<void> => {
  try {
    // Check if a summary already exists for this date
    const existingSummary = await getDailySummaryByDate(date);
    
    if (existingSummary) {
      // Update existing summary
      const summaryRef = doc(db, DAILY_SUMMARIES_COLLECTION, existingSummary.id || '');
      
      await updateDoc(summaryRef, {
        ...data,
        updatedAt: serverTimestamp(),
        supervisorSignature: {
          firstName: data.supervisorFirstName,
          lastName: data.supervisorLastName,
          uid: data.supervisorId,
        }
      });
    } else {
      // Create new summary
      await addDoc(collection(db, DAILY_SUMMARIES_COLLECTION), {
        date,
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        supervisorSignature: {
          firstName: data.supervisorFirstName,
          lastName: data.supervisorLastName,
          uid: data.supervisorId,
        }
      });
    }
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
}; 