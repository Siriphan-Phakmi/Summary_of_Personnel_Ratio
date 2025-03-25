import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { WardFormData, ApprovalStatus, Shift } from '@/app/types/ward';

// Collection name
const WARD_FORMS_COLLECTION = 'wardForms';

/**
 * Approve a ward form
 * @param id Form ID
 * @param supervisorFirstName Supervisor's first name
 * @param supervisorLastName Supervisor's last name
 * @param supervisorId Supervisor's user ID
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
      supervisorId,
      supervisorName: `${supervisorFirstName} ${supervisorLastName}`,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvedBy: {
        uid: supervisorId,
        firstName: supervisorFirstName,
        lastName: supervisorLastName,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error approving ward form:', error);
    throw error;
  }
};

/**
 * Check if morning shift for a date is approved
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @returns Boolean indicating if the morning shift is approved
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
 * Reject a ward form
 * @param id Form ID
 * @param reason Rejection reason
 * @param rejectedById User ID who rejected the form
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
      rejectionReason: reason,
      rejectedBy: rejectedById,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error rejecting ward form:', error);
    throw error;
  }
};

/**
 * Get forms pending approval
 * @returns List of ward forms with pending approval status
 */
export const getPendingApprovalForms = async (): Promise<WardFormData[]> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    const q = query(
      formsRef,
      where('approvalStatus', '==', 'pending'),
      orderBy('date', 'desc'),
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
    console.error('Error getting pending approval forms:', error);
    throw error;
  }
};

/**
 * Get ward forms with approval status
 * @param wardId Ward ID to filter by (optional)
 * @param limit Maximum number of forms to return (optional)
 * @returns List of ward forms
 */
export const getWardFormsWithApprovalStatus = async (
  wardId?: string,
  limitCount?: number
): Promise<WardFormData[]> => {
  try {
    const formsRef = collection(db, WARD_FORMS_COLLECTION);
    let q;
    
    if (wardId) {
      q = query(
        formsRef,
        where('wardId', '==', wardId),
        orderBy('date', 'desc'),
        orderBy('shift'),
        limitCount ? limit(limitCount) : limit(20)
      );
    } else {
      q = query(
        formsRef,
        orderBy('date', 'desc'),
        orderBy('shift'),
        limitCount ? limit(limitCount) : limit(20)
      );
    }
    
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
    console.error('Error getting ward forms with approval status:', error);
    throw error;
  }
};

/**
 * Update ward form approval status
 * @param formId Form ID
 * @param status New approval status
 * @param approvedBy Information about who approved the form
 */
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
    const formDoc = await getDoc(formRef);
    
    if (!formDoc.exists()) {
      throw new Error('Form not found');
    }
    
    await updateDoc(formRef, {
      approvalStatus: status,
      approvedBy: {
        ...approvedBy,
        timestamp: Date.now(),
      },
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      id: formId,
      ...formDoc.data(),
      approvalStatus: status,
      approvedBy: {
        ...approvedBy,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    console.error('Error updating ward form approval status:', error);
    throw error;
  }
}; 