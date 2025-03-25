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
  serverTimestamp,
  deleteDoc,
  startAfter
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { WardFormData, Ward, Shift, ApprovalStatus, DaySummaryData, WardFormFilters, DailySummary } from '@/app/types/ward';
import { format, subDays, parse } from 'date-fns';

// Collections
const WARDS_COLLECTION = 'wards';
const WARD_FORMS_COLLECTION = 'wardForms';
const DAY_SUMMARIES_COLLECTION = 'daySummaries';
const DAILY_SUMMARY_COLLECTION = 'dailySummary';

// Get all wards
export const getAllWards = async (): Promise<Ward[]> => {
  try {
    const wardsRef = collection(db, WARDS_COLLECTION);
    const q = query(wardsRef, orderBy('name'));
    const querySnapshot = await getDocs(q);

    const wards: Ward[] = [];
    querySnapshot.forEach((doc) => {
      wards.push({
        id: doc.id,
        ...doc.data(),
      } as Ward);
    });

    return wards;
  } catch (error) {
    console.error('Error getting wards:', error);
    throw error;
  }
};

// Get ward by ID
export const getWardById = async (id: string): Promise<Ward | null> => {
  try {
    const wardDoc = await getDoc(doc(db, WARDS_COLLECTION, id));
    
    if (wardDoc.exists()) {
      return {
        id: wardDoc.id,
        ...wardDoc.data(),
      } as Ward;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting ward:', error);
    throw error;
  }
};

// Get ward forms for a specific ward, date and optionally shift
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

// Get the most recent night shift form data for a ward
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
    console.error('Error fetching previous night shift data:', error);
    throw error;
  }
};

// Get ward forms for a specific date range
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

// Create or update a ward form
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
 * Approve ward form
 */
export const approveWardForm = async (
  id: string,
  supervisorFirstName: string,
  supervisorLastName: string,
  supervisorId: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    await updateDoc(formRef, {
      approvalStatus: 'approved',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      supervisorFirstName,
      supervisorLastName,
      supervisorId,
    });
  } catch (error) {
    console.error('Error approving ward form:', error);
    throw error;
  }
};

/**
 * Check if morning shift is approved for a specific date
 * Used to determine if night shift can be submitted
 */
export const checkMorningShiftApproved = async (
  wardId: string,
  date: string
): Promise<boolean> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    const q = query(
      formsRef,
      where('wardId', '==', wardId),
      where('date', '==', date),
      where('shift', '==', 'morning'),
      where('approvalStatus', '==', 'approved')
    );
    
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking morning shift approval:', error);
    throw error;
  }
};

/**
 * Reject ward form
 */
export const rejectWardForm = async (
  id: string,
  reason: string,
  rejectedById: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    await updateDoc(formRef, {
      approvalStatus: 'rejected',
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      rejectionReason: reason,
      rejectedById,
    });
  } catch (error) {
    console.error('Error rejecting ward form:', error);
    throw error;
  }
};

// Save day summary (24 hour summary)
export const saveDaySummary = async (
  summaryData: DaySummaryData
): Promise<string> => {
  try {
    // Add timestamp
    const dataToSave = {
      ...summaryData,
      timestamp: Date.now()
    };
    
    const docRef = await addDoc(collection(db, DAY_SUMMARIES_COLLECTION), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error('Error saving day summary:', error);
    throw error;
  }
};

// Get day summary for a specific ward and date
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
    console.error('Error fetching day summary:', error);
    throw error;
  }
};

// Get pending approval forms
export const getPendingApprovalForms = async (): Promise<WardFormData[]> => {
  try {
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
      where('approvalStatus', '==', 'pending'),
      where('status', '==', 'final'),
      orderBy('date', 'desc'),
      orderBy('wardName'),
      orderBy('shift')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WardFormData));
  } catch (error) {
    console.error('Error fetching pending approval forms:', error);
    throw error;
  }
};

// Get ward forms with approval status per ward
export const getWardFormsWithApprovalStatus = async (
  wardId: string,
  limitSize?: number
): Promise<WardFormData[]> => {
  try {
    let q;
    
    if (limitSize) {
      q = query(
        collection(db, WARD_FORMS_COLLECTION),
        where('wardId', '==', wardId),
        orderBy('date', 'desc'),
        orderBy('shift'),
        limit(limitSize)
      );
    } else {
      q = query(
        collection(db, WARD_FORMS_COLLECTION),
        where('wardId', '==', wardId),
        orderBy('date', 'desc'),
        orderBy('shift')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WardFormData));
  } catch (error) {
    console.error('Error fetching ward forms with approval status:', error);
    throw error;
  }
};

// Calculate patient census based on previous data and current inputs
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
  // Add new patients
  const additions = newAdmit + transferIn + referIn;
  
  // Subtract departures
  const subtractions = transferOut + referOut + discharge + dead;
  
  // Calculate new census
  return previousPatientCensus + additions - subtractions;
};

// Get ward forms
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
    const { wardId, userId, approvalStatus, startDate, endDate, shift, limit: queryLimit = 100, lastDoc } = filters;
    
    // Build query
    let q: any = collection(db, WARD_FORMS_COLLECTION);
    
    // Query conditions
    const conditions: any[] = [];
    
    if (wardId) {
      conditions.push(where('wardId', '==', wardId));
    }
    
    if (userId) {
      conditions.push(where('userId', '==', userId));
    }
    
    if (approvalStatus) {
      conditions.push(where('approvalStatus', '==', approvalStatus));
    }
    
    if (shift && shift !== 'all') {
      conditions.push(where('shift', '==', shift));
    }
    
    if (startDate && endDate) {
      conditions.push(where('date', '>=', startDate));
      conditions.push(where('date', '<=', endDate));
    }
    
    let baseQuery = q;
    if (conditions.length > 0) {
      baseQuery = query(q, ...conditions);
    }
    q = query(baseQuery, orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
    
    // Add pagination
    if (queryLimit) {
      q = query(q, limit(queryLimit));
    }
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    
    const forms: WardFormData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      forms.push({
        id: doc.id,
        ...data,
      } as WardFormData);
    });
    
    return forms;
  } catch (error) {
    console.error('Error getting ward forms:', error);
    throw error;
  }
};

// Update ward form approval status
export const updateWardFormApprovalStatus = async (
  formId: string,
  status: ApprovalStatus,
  approvedBy: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
  }
) => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
    
    await updateDoc(formRef, {
      approvalStatus: status,
      approvedBy: {
        ...approvedBy,
        timestamp: Date.now()
      },
      lastModified: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating ward form approval status:', error);
    throw error;
  }
};

// Edit ward form data by admin
export const editWardFormByAdmin = async (
  formId: string,
  updatedData: Partial<WardFormData>,
  userId: string,
  userName: string
) => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
    const formDoc = await getDoc(formRef);
    
    if (!formDoc.exists()) {
      throw new Error('Form not found');
    }
    
    const currentData = formDoc.data() as WardFormData;
    const changes: {
      field: string;
      previousValue: any;
      newValue: any;
    }[] = [];
    
    // Track changes for edit history
    Object.keys(updatedData).forEach(key => {
      const typedKey = key as keyof WardFormData;
      if (
        typedKey !== 'id' &&
        typedKey !== 'editHistory' &&
        typedKey !== 'lastModified' &&
        JSON.stringify(currentData[typedKey]) !== JSON.stringify(updatedData[typedKey])
      ) {
        changes.push({
          field: key,
          previousValue: currentData[typedKey],
          newValue: updatedData[typedKey]
        });
      }
    });
    
    // Only proceed if there are actual changes
    if (changes.length > 0) {
      // Create edit history entry
      const historyEntry = {
        timestamp: Date.now(),
        userId,
        userName,
        action: 'admin_edit',
        changes
      };
      
      // Update document with new data and append to edit history
      await updateDoc(formRef, {
        ...updatedData,
        lastModified: Date.now(),
        editHistory: [
          ...(currentData.editHistory || []),
          historyEntry
        ]
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error editing ward form by admin:', error);
    throw error;
  }
};

// Save daily summary data
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
        timestamp: Date.now()
      });
      resultId = summaryId;
    } else {
      // Create new summary
      const summaryRef = await addDoc(collection(db, DAILY_SUMMARY_COLLECTION), {
        ...summaryData,
        timestamp: Date.now()
      });
      resultId = summaryRef.id;
    }
    
    return resultId;
  } catch (error) {
    console.error('Error saving daily summary:', error);
    throw error;
  }
};

// Get daily summary by date
export const getDailySummaryByDate = async (
  date: string
): Promise<DailySummary | null> => {
  try {
    const q = query(
      collection(db, DAILY_SUMMARY_COLLECTION),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as DailySummary;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting daily summary by date:', error);
    throw error;
  }
};

// Create a new ward
export const createWard = async (
  name: string,
  description: string,
  createdBy: string
): Promise<string> => {
  try {
    const wardRef = doc(collection(db, WARDS_COLLECTION));
    
    await setDoc(wardRef, {
      name,
      description,
      createdAt: serverTimestamp(),
      createdBy,
      active: true,
    });

    return wardRef.id;
  } catch (error) {
    console.error('Error creating ward:', error);
    throw error;
  }
};

// Update ward
export const updateWard = async (
  id: string,
  data: Partial<Ward>
): Promise<void> => {
  try {
    const wardRef = doc(db, WARDS_COLLECTION, id);
    
    // Add timestamp
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(wardRef, updateData);
  } catch (error) {
    console.error('Error updating ward:', error);
    throw error;
  }
};

// Save ward form as draft
export const saveWardFormDraft = async (
  formData: Omit<WardFormData, 'id' | 'createdAt' | 'updatedAt' | 'approvalStatus'>
): Promise<string> => {
  try {
    const formRef = doc(collection(db, WARD_FORMS_COLLECTION));
    
    const dataToSave = {
      ...formData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvalStatus: 'draft',
    };
    
    await setDoc(formRef, dataToSave);
    
    return formRef.id;
  } catch (error) {
    console.error('Error saving ward form draft:', error);
    throw error;
  }
};

// Update ward form draft
export const updateWardFormDraft = async (
  id: string,
  formData: Partial<WardFormData>
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    // Add timestamp
    const updateData = {
      ...formData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(formRef, updateData);
  } catch (error) {
    console.error('Error updating ward form draft:', error);
    throw error;
  }
};

// Submit ward form (finalize)
export const submitWardForm = async (
  id: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    await updateDoc(formRef, {
      approvalStatus: 'pending',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error submitting ward form:', error);
    throw error;
  }
};

// Get ward form by ID
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
    console.error('Error getting ward form:', error);
    throw error;
  }
};

// Get ward form by date and shift
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
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as WardFormData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting ward form by date and shift:', error);
    throw error;
  }
};

// Get previous ward form
export const getPreviousWardForm = async (
  wardId: string,
  date: string,
  shift: Shift
): Promise<WardFormData | null> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    let q;
    
    if (shift === 'morning') {
      // If current shift is morning, get the night shift of previous day
      q = query(
        formsRef,
        where('wardId', '==', wardId),
        where('date', '<', date),
        where('shift', '==', 'night'),
        where('approvalStatus', '==', 'approved'),
        orderBy('date', 'desc'),
        limit(1)
      );
    } else {
      // If current shift is night, get the morning shift of the same day
      q = query(
        formsRef,
        where('wardId', '==', wardId),
        where('date', '==', date),
        where('shift', '==', 'morning'),
        where('approvalStatus', '==', 'approved'),
        limit(1)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as WardFormData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting previous ward form:', error);
    throw error;
  }
};

// Update daily summary
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
    const summaryRef = doc(db, 'dailySummaries', date);
    
    await setDoc(summaryRef, {
      ...data,
      date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
}; 