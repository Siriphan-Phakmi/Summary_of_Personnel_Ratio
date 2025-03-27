import { db, rtdb } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, get, set, update } from 'firebase/database';
import { logUserAction } from './logUtils';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds

/**
 * Interface for user lock status
 */
interface LockStatus {
  isLocked: boolean;
  remainingTime: number; // in seconds
}

/**
 * Get user document by username
 */
export const getUserByUsername = async (username: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
};

/**
 * Check if a user account is locked and calculate remaining time
 */
export const getUserLockedStatus = async (username: string): Promise<LockStatus> => {
  try {
    const user = await getUserByUsername(username);
    
    if (!user) {
      return { isLocked: false, remainingTime: 0 };
    }
    
    const userId = user.id;
    const lockoutRef = ref(rtdb, `userLockouts/${userId}`);
    const snapshot = await get(lockoutRef);
    
    if (!snapshot.exists()) {
      return { isLocked: false, remainingTime: 0 };
    }
    
    const lockData = snapshot.val();
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    
    if (lockData.lockedUntil > now) {
      // Account is still locked
      const remainingTime = lockData.lockedUntil - now;
      return { isLocked: true, remainingTime };
    } else {
      // Lock expired, remove the lock
      await set(lockoutRef, null);
      return { isLocked: false, remainingTime: 0 };
    }
  } catch (error) {
    console.error('Error checking lock status:', error);
    return { isLocked: false, remainingTime: 0 };
  }
};

/**
 * Record a failed login attempt
 */
export const recordFailedLoginAttempt = async (username: string): Promise<boolean> => {
  try {
    const user = await getUserByUsername(username);
    
    if (!user) {
      return false;
    }
    
    const userId = user.id;
    const failedAttemptsRef = ref(rtdb, `userLockouts/${userId}/failedAttempts`);
    const snapshot = await get(failedAttemptsRef);
    
    let attempts = 1;
    if (snapshot.exists()) {
      attempts = snapshot.val() + 1;
    }
    
    // Update the count of failed attempts
    await set(failedAttemptsRef, attempts);
    
    // If max attempts reached, lock the account
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const lockoutUntil = now + LOCKOUT_DURATION;
      
      const lockoutRef = ref(rtdb, `userLockouts/${userId}`);
      await set(lockoutRef, {
        failedAttempts: attempts,
        lockedUntil: lockoutUntil,
        lockedAt: now
      });
      
      // Log account locked event
      await logUserAction(
        userId,
        user.username || user.email,
        'user.account_locked',
        { 
          reason: 'too_many_failed_attempts',
          attempts,
          lockoutDuration: LOCKOUT_DURATION
        }
      );
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error recording failed login attempt:', error);
    return false;
  }
};

/**
 * Reset failed login attempts for a user
 */
export const resetLoginAttempts = async (username: string): Promise<boolean> => {
  try {
    const user = await getUserByUsername(username);
    
    if (!user) {
      return false;
    }
    
    const userId = user.id;
    const lockoutRef = ref(rtdb, `userLockouts/${userId}`);
    await set(lockoutRef, null);
    
    // Log account unlock event
    await logUserAction(
      userId,
      user.username || user.email,
      'user.account_unlocked',
      { reason: 'admin_reset' }
    );
    
    return true;
  } catch (error) {
    console.error('Error resetting login attempts:', error);
    return false;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string, 
  data: Partial<any>
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date()
    });
    
    // Log profile update
    await logUserAction(
      userId,
      data.username || data.email || 'unknown',
      'user.profile_updated',
      { updatedFields: Object.keys(data) }
    );
    
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

/**
 * Change user active status (enable/disable account)
 */
export const setUserActiveStatus = async (
  userId: string, 
  isActive: boolean,
  adminId: string,
  adminName: string
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    
    await updateDoc(userRef, {
      active: isActive,
      updatedAt: new Date()
    });
    
    // Log account status change
    await logUserAction(
      userId,
      userData.username || userData.email || 'unknown',
      isActive ? 'user.account_enabled' : 'user.account_disabled',
      { 
        performedBy: {
          id: adminId,
          name: adminName
        }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error setting user active status:', error);
    return false;
  }
};

/**
 * Get a user's wards and permissions
 */
export const getUserPermissions = async (userId: string): Promise<{
  wards: string[];
  role: string;
  canApprove: boolean;
}> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { wards: [], role: 'user', canApprove: false };
    }
    
    const userData = userDoc.data();
    
    return {
      wards: userData.wards || [],
      role: userData.role || 'user',
      canApprove: userData.role === 'admin' || userData.role === 'approver'
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return { wards: [], role: 'user', canApprove: false };
  }
}; 