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
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { WardFormData, Shift, ApprovalStatus } from '@/app/types/ward';

// Collection name
const WARD_FORMS_COLLECTION = 'wardForms';

/**
 * Get ward form by date and shift
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @param shift Optional shift (morning, evening, night)
 * @returns Ward form data or null
 */
export const getWardFormByDateAndShift = async (
  wardId: string,
  date: string,
  shift?: Shift
): Promise<WardFormData | null> => {
  try {
    const constraints: QueryConstraint[] = [
      where('wardId', '==', wardId),
      where('date', '==', date),
    ];

    if (shift) {
      constraints.push(where('shift', '==', shift));
    }

    const q = query(collection(db, WARD_FORMS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // Return the first matching document
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as WardFormData;
  } catch (error) {
    console.error('Error fetching ward form:', error);
    throw error;
  }
};

/**
 * Get ward form by ID
 * @param id Form ID
 * @returns Ward form data or null
 */
export const getWardFormById = async (id: string): Promise<WardFormData | null> => {
  try {
    const formDoc = await getDoc(doc(db, WARD_FORMS_COLLECTION, id));
    
    if (formDoc.exists()) {
      return {
        id: formDoc.id,
        ...formDoc.data()
      } as WardFormData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting ward form by ID:', error);
    throw error;
  }
};

/**
 * Get ward form by date and specific shift
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @param shift Shift (morning, evening, night)
 * @returns Ward form data or null
 */
export const getWardFormByDateShift = async (
  wardId: string,
  date: string,
  shift: Shift
): Promise<WardFormData | null> => {
  try {
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift)
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
    console.error('Error fetching ward form by date and shift:', error);
    throw error;
  }
};

/**
 * Create or update a ward form
 * @param formData Form data
 * @param formId Optional existing form ID
 * @returns Form ID
 */
export const saveWardForm = async (
  formData: WardFormData,
  formId?: string
): Promise<string> => {
  try {
    let resultId: string;
    
    if (formId) {
      // Update existing form
      const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
      await updateDoc(formRef, {
        ...formData,
        lastModified: Date.now()
      });
      resultId = formId;
    } else {
      // Create new form
      const formRef = await addDoc(collection(db, WARD_FORMS_COLLECTION), {
        ...formData,
        lastModified: Date.now()
      });
      resultId = formRef.id;
    }
    
    return resultId;
  } catch (error) {
    console.error('Error saving ward form:', error);
    throw error;
  }
};

/**
 * Save ward form as draft
 * @param formData Form data
 * @returns Form ID
 */
export const saveWardFormDraft = async (
  formData: Omit<WardFormData, 'id' | 'createdAt' | 'updatedAt' | 'approvalStatus'>
): Promise<string> => {
  try {
    const formRef = await addDoc(collection(db, WARD_FORMS_COLLECTION), {
      ...formData,
      approvalStatus: 'draft' as ApprovalStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return formRef.id;
  } catch (error) {
    console.error('Error saving ward form draft:', error);
    throw error;
  }
};

/**
 * Update an existing ward form draft
 * @param id Form ID
 * @param formData Updated form data
 */
export const updateWardFormDraft = async (
  id: string,
  formData: Partial<WardFormData>
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    await updateDoc(formRef, {
      ...formData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating ward form draft:', error);
    throw error;
  }
};

/**
 * Submit a ward form for approval
 * @param id Form ID
 */
export const submitWardForm = async (
  id: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    await updateDoc(formRef, {
      approvalStatus: 'pending' as ApprovalStatus,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error submitting ward form:', error);
    throw error;
  }
};

/**
 * Calculate patient census
 * @param previousPatientCensus Previous census
 * @param newAdmit New admissions
 * @param transferIn Transfers in
 * @param referIn Refers in
 * @param transferOut Transfers out
 * @param referOut Refers out
 * @param discharge Discharges
 * @param dead Deaths
 * @returns New patient census
 */
export const calculatePatientCensus = (
  previousPatientCensus: number,
  newAdmit: number,
  transferIn: number,
  referIn: number,
  transferOut: number,
  referOut: number,
  discharge: number,
  dead: number
): number => {
  // Calculate census
  return previousPatientCensus + newAdmit + transferIn + referIn 
         - transferOut - referOut - discharge - dead;
};

/**
 * Get the previous ward form data
 * @param wardId Ward ID
 * @param date Date string in YYYY-MM-DD format
 * @param shift Current shift
 * @returns Previous form data or null
 */
export const getPreviousWardForm = async (
  wardId: string,
  date: string,
  shift: Shift
): Promise<WardFormData | null> => {
  try {
    let previousShift: Shift | null = null;
    let previousDate = date;
    
    // Determine previous shift and date
    if (shift === 'morning') {
      // Previous would be night shift of the previous day
      const dateParts = date.split('-');
      const dateObj = new Date(
        parseInt(dateParts[0]), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[2])
      );
      dateObj.setDate(dateObj.getDate() - 1);
      
      // Format as YYYY-MM-DD
      previousDate = dateObj.toISOString().split('T')[0];
      previousShift = 'night';
    } else if (shift === 'evening') {
      previousShift = 'morning';
    } else if (shift === 'night') {
      previousShift = 'evening';
    }
    
    if (!previousShift) {
      return null;
    }
    
    // Query for the previous shift's form
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
      where('wardId', '==', wardId),
      where('date', '==', previousDate),
      where('shift', '==', previousShift),
      where('approvalStatus', '==', 'approved'),
      limit(1)
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
    console.error('Error getting previous ward form:', error);
    throw error;
  }
}; 