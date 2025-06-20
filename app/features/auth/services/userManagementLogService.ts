import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';

export type UserManagementLogAction = 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER' | 'TOGGLE_STATUS';

export interface UserManagementLog {
  action: UserManagementLogAction;
  adminUid: string;
  adminUsername: string;
  targetUid: string;
  targetUsername: string;
  timestamp: any;
  details?: Record<string, any>;
}

const LOG_COLLECTION = 'userManagementLogs';

/**
 * Logs an administrative action related to user management.
 * @param logData - The data for the log entry.
 */
export const logUserManagementAction = async (logData: Omit<UserManagementLog, 'timestamp'>): Promise<void> => {
  try {
    const logCollectionRef = collection(db, LOG_COLLECTION);
    await addDoc(logCollectionRef, {
      ...logData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to write user management log:', error);
    // We don't re-throw the error here because a logging failure should not
    // block the primary user management operation from succeeding.
  }
}; 