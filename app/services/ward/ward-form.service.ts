import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { 
  WardFormData, 
  Ward, 
  Shift, 
  ApprovalStatus, 
  SaveStatus,
  EditHistoryEntry
} from '@/app/types/ward';
import { format, subDays, parse } from 'date-fns';

// Collection names
const WARD_FORMS_COLLECTION = 'wardForms';

/**
 * Get ward form by date and shift
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @param shift Shift (morning or night), optional
 * @returns Ward form data or null if not found
 */
export const getWardFormByDateAndShift = async (
  wardId: string,
  date: string,
  shift?: Shift
): Promise<WardFormData | null> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    let q;
    
    if (shift) {
      q = query(
        formsRef,
        where('wardId', '==', wardId),
        where('date', '==', date),
        where('shift', '==', shift)
      );
    } else {
      q = query(
        formsRef,
        where('wardId', '==', wardId),
        where('date', '==', date)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as WardFormData;
  } catch (error) {
    console.error('Error getting ward form:', error);
    throw error;
  }
};

/**
 * Get previous night shift data
 * @param wardId Ward ID
 * @param date Current date in YYYY-MM-DD format
 * @returns Previous night shift data or null if not found
 */
export const getPreviousNightShiftData = async (
  wardId: string,
  date: string
): Promise<WardFormData | null> => {
  try {
    // Parse the selected date
    const selectedDate = parse(date, 'yyyy-MM-dd', new Date());
    
    // Get the previous day
    const previousDay = subDays(selectedDate, 1);
    const previousDate = format(previousDay, 'yyyy-MM-dd');
    
    // Get the previous night shift data
    const prevNightData = await getWardFormByDateAndShift(wardId, previousDate, 'night');
    
    // Check if previous night shift exists and has been approved
    if (prevNightData && prevNightData.approvalStatus === 'approved') {
      return prevNightData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting previous night shift data:', error);
    throw error;
  }
};

/**
 * Get ward forms by date range
 * @param wardId Ward ID
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @returns List of ward forms
 */
export const getWardFormsByDateRange = async (
  wardId: string,
  startDate: string,
  endDate: string
): Promise<WardFormData[]> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    const q = query(
      formsRef,
      where('wardId', '==', wardId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date'),
      orderBy('shift')
    );
    
    const querySnapshot = await getDocs(q);
    
    const forms: WardFormData[] = [];
    querySnapshot.forEach((doc) => {
      forms.push({
        id: doc.id,
        ...doc.data(),
      } as WardFormData);
    });
    
    return forms;
  } catch (error) {
    console.error('Error getting ward forms by date range:', error);
    throw error;
  }
};

/**
 * Save ward form
 * @param formData Ward form data
 * @param formId Optional form ID for updating existing form
 * @returns Form ID
 */
export const saveWardForm = async (
  formData: WardFormData,
  formId?: string
): Promise<string> => {
  try {
    if (formId) {
      // Update existing form
      const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
      
      // Add timestamp
      const updateData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(formRef, updateData);
      return formId;
    } else {
      // Create new form
      const docRef = await addDoc(collection(db, WARD_FORMS_COLLECTION), {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving ward form:', error);
    throw error;
  }
};

/**
 * Calculate patient census based on inputs
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
  // Calculate current patient census
  // Previous + (admitted patients) - (discharged patients)
  return (
    previousPatientCensus +
    newAdmit +
    transferIn +
    referIn -
    transferOut -
    referOut -
    discharge -
    dead
  );
};

/**
 * Get ward forms with flexible filtering
 */
export const getWardForms = async (filters: {
  wardId?: string;
  userId?: string;
  approvalStatus?: string;
  startDate?: string;
  endDate?: string;
  shift?: Shift | 'all';
  limit?: number;
  lastDoc?: any;
}): Promise<WardFormData[]> => {
  try {
    const {
      wardId,
      userId,
      approvalStatus,
      startDate,
      endDate,
      shift,
      limit: limitSize = 20,
      lastDoc
    } = filters;
    
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    let queryConstraints: any[] = [];
    
    // Add conditions based on filters
    if (wardId) {
      queryConstraints.push(where('wardId', '==', wardId));
    }
    
    if (userId) {
      queryConstraints.push(where('userId', '==', userId));
    }
    
    if (approvalStatus) {
      queryConstraints.push(where('approvalStatus', '==', approvalStatus));
    }
    
    if (startDate) {
      queryConstraints.push(where('date', '>=', startDate));
    }
    
    if (endDate) {
      queryConstraints.push(where('date', '<=', endDate));
    }
    
    if (shift && shift !== 'all') {
      queryConstraints.push(where('shift', '==', shift));
    }
    
    // Add sorting
    queryConstraints.push(orderBy('date', 'desc'));
    queryConstraints.push(orderBy('shift'));
    
    // Add pagination
    if (limitSize && limitSize > 0) {
      queryConstraints.push(limit(limitSize));
    }
    
    // Apply lastDoc for pagination if provided
    if (lastDoc) {
      queryConstraints.push(lastDoc);
    }
    
    // Create query with all constraints
    const q = query(formsRef, ...queryConstraints);
    
    const querySnapshot = await getDocs(q);
    
    const forms: WardFormData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      forms.push({
        id: doc.id || '',
        ...data,
      } as WardFormData);
    });
    
    return forms;
  } catch (error) {
    console.error('Error getting ward forms:', error);
    throw error;
  }
};

/**
 * Get ward form by ID
 */
export const getWardFormById = async (id: string): Promise<WardFormData | null> => {
  try {
    const formDoc = await getDoc(doc(db, WARD_FORMS_COLLECTION, id));
    
    if (formDoc.exists()) {
      return {
        id: formDoc.id,
        ...formDoc.data(),
      } as WardFormData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting ward form by ID:', error);
    throw error;
  }
};

/**
 * Get ward form by date and shift
 */
export const getWardFormByDateShift = async (
  wardId: string,
  date: string,
  shift: Shift
): Promise<WardFormData | null> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    const q = query(
      formsRef,
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', shift)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const formDoc = querySnapshot.docs[0];
    return {
      id: formDoc.id,
      ...formDoc.data(),
    } as WardFormData;
  } catch (error) {
    console.error('Error getting ward form by date and shift:', error);
    throw error;
  }
};

/**
 * Get previous ward form for a given ward, date, and shift
 */
export const getPreviousWardForm = async (
  wardId: string,
  date: string,
  shift: Shift
): Promise<WardFormData | null> => {
  try {
    // Get previous date or previous shift based on current shift
    let targetDate = date;
    let targetShift: Shift = 'morning';
    
    if (shift === 'morning') {
      // For morning shift, get previous day's night shift
      const currentDate = new Date(date);
      const prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 1);
      targetDate = format(prevDate, 'yyyy-MM-dd');
      targetShift = 'night';
    } else {
      // For night shift, get same day's morning shift
      targetShift = 'morning';
    }
    
    return getWardFormByDateShift(wardId, targetDate, targetShift);
  } catch (error) {
    console.error('Error getting previous ward form:', error);
    throw error;
  }
};

/**
 * Edit ward form by admin
 */
export const editWardFormByAdmin = async (
  formId: string,
  updatedData: Partial<WardFormData>,
  userId: string,
  userName: string
) => {
  try {
    // Get current data
    const currentFormData = await getWardFormById(formId);
    
    if (!currentFormData) {
      throw new Error('Form not found');
    }
    
    // Keep track of changes
    const changes: {
      field: string;
      previousValue: any;
      newValue: any;
    }[] = [];
    
    // Compare each field and log changes
    Object.keys(updatedData).forEach((key) => {
      const typedKey = key as keyof WardFormData;
      
      // Skip id, editHistory or fields that didn't change
      if (
        typedKey !== 'id' &&
        typedKey !== 'editHistory' &&
        typedKey !== 'lastModified' &&
        JSON.stringify(currentFormData[typedKey]) !== JSON.stringify(updatedData[typedKey])
      ) {
        changes.push({
          field: typedKey,
          previousValue: currentFormData[typedKey],
          newValue: updatedData[typedKey],
        });
      }
    });
    
    // Create edit history entry
    const editEntry: EditHistoryEntry = {
      timestamp: Date.now(),
      userId,
      userName,
      action: 'edit',
      changes,
    };
    
    // Prepare edit history array
    const editHistory = currentFormData.editHistory || [];
    editHistory.push(editEntry);
    
    // Update the form with new data and edit history
    const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
    await updateDoc(formRef, {
      ...updatedData,
      lastModified: Date.now(),
      editHistory,
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...currentFormData,
      ...updatedData,
      editHistory,
    };
  } catch (error) {
    console.error('Error editing ward form by admin:', error);
    throw error;
  }
};

/**
 * Save ward form draft
 */
export const saveWardFormDraft = async (
  formData: Omit<WardFormData, 'id' | 'createdAt' | 'updatedAt' | 'approvalStatus'>
): Promise<string> => {
  try {
    // Create new draft
    const docRef = await addDoc(collection(db, WARD_FORMS_COLLECTION), {
      ...formData,
      approvalStatus: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving ward form draft:', error);
    throw error;
  }
};

/**
 * Update ward form draft
 */
export const updateWardFormDraft = async (
  id: string,
  formData: Partial<WardFormData>
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    await updateDoc(formRef, {
      ...formData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating ward form draft:', error);
    throw error;
  }
};

/**
 * Submit ward form (changing status from draft to pending)
 */
export const submitWardForm = async (
  id: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    await updateDoc(formRef, {
      approvalStatus: 'pending',
      status: 'final',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error submitting ward form:', error);
    throw error;
  }
}; 