import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { DaySummaryData, DailySummary } from '@/app/types/ward';

// Collection names
const DAY_SUMMARIES_COLLECTION = 'daySummaries';
const DAILY_SUMMARY_COLLECTION = 'dailySummary';

/**
 * Save day summary for a ward
 * @param summaryData Day summary data
 * @returns Summary ID
 */
export const saveDaySummary = async (
  summaryData: DaySummaryData
): Promise<string> => {
  try {
    const summaryRef = await addDoc(collection(db, DAY_SUMMARIES_COLLECTION), {
      ...summaryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return summaryRef.id;
  } catch (error) {
    console.error('Error saving day summary:', error);
    throw error;
  }
};

/**
 * Get day summary for a ward
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @returns Day summary data or null
 */
export const getDaySummary = async (
  wardId: string,
  date: string
): Promise<DaySummaryData | null> => {
  try {
    const q = query(
      collection(db, DAY_SUMMARIES_COLLECTION),
      where('wardId', '==', wardId),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as DaySummaryData;
  } catch (error) {
    console.error('Error getting day summary:', error);
    throw error;
  }
};

/**
 * Save daily summary (across all wards)
 * @param summaryData Daily summary data
 * @param summaryId Optional existing summary ID
 * @returns Summary ID
 */
export const saveDailySummary = async (
  summaryData: DailySummary,
  summaryId?: string
): Promise<string> => {
  try {
    let resultId: string;
    
    if (summaryId) {
      // Update existing summary
      const summaryRef = doc(db, DAILY_SUMMARY_COLLECTION, summaryId);
      await updateDoc(summaryRef, {
        ...summaryData,
        updatedAt: serverTimestamp()
      });
      resultId = summaryId;
    } else {
      // Create new summary
      const summaryRef = await addDoc(collection(db, DAILY_SUMMARY_COLLECTION), {
        ...summaryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      resultId = summaryRef.id;
    }
    
    return resultId;
  } catch (error) {
    console.error('Error saving daily summary:', error);
    throw error;
  }
};

/**
 * Get daily summary for a specific date
 * @param date Date in YYYY-MM-DD format
 * @returns Daily summary data or null
 */
export const getDailySummaryByDate = async (
  date: string
): Promise<DailySummary | null> => {
  try {
    const q = query(
      collection(db, DAILY_SUMMARY_COLLECTION),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as DailySummary;
  } catch (error) {
    console.error('Error getting daily summary by date:', error);
    throw error;
  }
};

/**
 * Update daily summary with additional data
 * @param date Date in YYYY-MM-DD format
 * @param data Data to update
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
    // Check if summary exists
    const summary = await getDailySummaryByDate(date);
    
    if (!summary || !summary.id) {
      throw new Error('Daily summary not found for the date');
    }
    
    const summaryRef = doc(db, DAILY_SUMMARY_COLLECTION, summary.id);
    
    // Update with additional data
    await updateDoc(summaryRef, {
      ...data,
      updatedAt: serverTimestamp(),
      hasAdditionalData: true
    });
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
}; 