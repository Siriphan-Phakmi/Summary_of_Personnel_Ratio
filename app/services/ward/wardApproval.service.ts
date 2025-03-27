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
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { WardFormData, Shift, ApprovalStatus } from '@/app/types/ward';

// Collection name
const WARD_FORMS_COLLECTION = 'wardForms';

/**
 * Approve a ward form
 * @param id Form ID
 * @param supervisorFirstName Supervisor first name
 * @param supervisorLastName Supervisor last name
 * @param supervisorId Supervisor user ID
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
      approvalStatus: 'approved' as ApprovalStatus,
      approvedAt: serverTimestamp(),
      approvedBy: {
        firstName: supervisorFirstName,
        lastName: supervisorLastName,
        userId: supervisorId
      }
    });
  } catch (error) {
    console.error('Error approving ward form:', error);
    throw error;
  }
};

/**
 * Check if morning shift for a ward on a specific date is approved
 * @param wardId Ward ID
 * @param date Date in YYYY-MM-DD format
 * @returns True if morning shift is approved
 */
export const checkMorningShiftApproved = async (
  wardId: string,
  date: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
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
 * @param rejectedById User ID who rejected
 */
export const rejectWardForm = async (
  id: string,
  reason: string,
  rejectedById: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, id);
    
    await updateDoc(formRef, {
      approvalStatus: 'rejected' as ApprovalStatus,
      rejectedAt: serverTimestamp(),
      rejectedBy: rejectedById,
      rejectionReason: reason
    });
  } catch (error) {
    console.error('Error rejecting ward form:', error);
    throw error;
  }
};

/**
 * Get all pending approval forms
 * @returns Array of pending forms
 */
export const getPendingApprovalForms = async (): Promise<WardFormData[]> => {
  try {
    const q = query(
      collection(db, WARD_FORMS_COLLECTION),
      where('approvalStatus', '==', 'pending'),
      orderBy('submittedAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WardFormData));
  } catch (error) {
    console.error('Error getting pending approval forms:', error);
    throw error;
  }
};

/**
 * Get ward forms with specific approval status
 * @param wardId Ward ID 
 * @param limitSize Optional result limit
 * @returns Array of forms
 */
export const getWardFormsWithApprovalStatus = async (
  wardId: string,
  limitSize?: number
): Promise<WardFormData[]> => {
  try {
    let constraints = [
      where('wardId', '==', wardId),
      where('approvalStatus', 'in', ['approved', 'rejected', 'pending']),
      orderBy('date', 'desc'),
      orderBy('shift')
    ];
    
    if (limitSize) {
      constraints.push(limit(limitSize));
    }
    
    const q = query(collection(db, WARD_FORMS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WardFormData));
  } catch (error) {
    console.error('Error getting ward forms with approval status:', error);
    throw error;
  }
};

/**
 * Update ward form approval status
 * @param formId Form ID
 * @param status New approval status
 * @param approvedBy Approval information
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
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
    const formDoc = await getDoc(formRef);
    
    if (!formDoc.exists()) {
      throw new Error('Form not found');
    }
    
    const updateData: any = {
      approvalStatus: status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'approved') {
      updateData.approvedAt = serverTimestamp();
      updateData.approvedBy = {
        userId: approvedBy.uid,
        firstName: approvedBy.firstName,
        lastName: approvedBy.lastName,
        email: approvedBy.email
      };
    }
    
    await updateDoc(formRef, updateData);
  } catch (error) {
    console.error('Error updating ward form approval status:', error);
    throw error;
  }
};

/**
 * Edit ward form by admin
 * @param formId Form ID
 * @param updatedData Updated form data
 * @param userId Admin user ID
 * @param userName Admin user name
 */
export const editWardFormByAdmin = async (
  formId: string,
  updatedData: Partial<WardFormData>,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    const formRef = doc(db, WARD_FORMS_COLLECTION, formId);
    const formDoc = await getDoc(formRef);
    
    if (!formDoc.exists()) {
      throw new Error('Form not found');
    }
    
    const existingData = formDoc.data() as WardFormData;
    
    // Check if form is already finalized
    if (existingData.approvalStatus === 'approved') {
      // Create an edit history entry
      const editHistory = existingData.editHistory || [];
      
      editHistory.push({
        timestamp: new Date().toISOString(),
        userId,
        userName,
        oldData: {
          patientCensus: existingData.patientCensus,
          nurses: existingData.nurses,
          pn: existingData.pn,
          aides: existingData.aides,
          supportStaff: existingData.supportStaff,
          // Add any other fields that can be edited
        },
        changedFields: Object.keys(updatedData)
      });
      
      // Update with both the new data and edit history
      await updateDoc(formRef, {
        ...updatedData,
        editHistory,
        lastEditedBy: {
          userId,
          userName,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } else {
      // For non-approved forms, just update the data
      await updateDoc(formRef, {
        ...updatedData,
        lastEditedBy: {
          userId,
          userName,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error editing ward form by admin:', error);
    throw error;
  }
}; 