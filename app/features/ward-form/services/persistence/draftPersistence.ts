/**
 * 🔒 SECURE DRAFT PERSISTENCE SERVICE
 * ใช้ Firebase Firestore เพื่อความปลอดภัย แทน localStorage
 * เก็บข้อมูล draft ใน collection userDrafts ที่มีความปลอดภัยสูง
 */

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { Logger } from '@/app/lib/utils/logger';

// 🔒 Collection name สำหรับ drafts ที่ปลอดภัย
const COLLECTION_USER_DRAFTS = 'userDrafts';

export interface DraftData {
  id: string;
  userId: string;
  wardId: string;
  shift: ShiftType;
  dateString: string;
  formData: Partial<WardForm>;
  isDraft: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // Auto-cleanup after 7 days
}

/**
 * 🔒 สร้าง Draft ID ที่ unique และปลอดภัย
 */
const createDraftId = (userId: string, wardId: string, shift: ShiftType, dateString: string): string => {
  return `${userId}_${wardId}_${shift}_${dateString}`;
};

/**
 * 🔒 บันทึก Draft ลง Firebase Firestore (ปลอดภัย)
 */
export const saveDraftToFirebase = async (
  user: User,
  wardId: string,
  shift: ShiftType,
  dateString: string,
  formData: Partial<WardForm>
): Promise<boolean> => {
  try {
    const draftId = createDraftId(user.uid, wardId, shift, dateString);
    const draftRef = doc(db, COLLECTION_USER_DRAFTS, draftId);
    
    // Set expiry to 7 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    const draftData: DraftData = {
      id: draftId,
      userId: user.uid,
      wardId,
      shift,
      dateString,
      formData,
      isDraft: true,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      expiresAt: Timestamp.fromDate(expiryDate),
    };
    
    await setDoc(draftRef, draftData, { merge: true });
    Logger.info(`[SecureDraft] Saved to Firebase: ${draftId}`);
    return true;
  } catch (error) {
    Logger.error('[SecureDraft] Failed to save to Firebase:', error);
    return false;
  }
};

/**
 * 🔒 โหลด Draft จาก Firebase Firestore (ปลอดภัย)
 */
export const loadDraftFromFirebase = async (
  user: User,
  wardId: string,
  shift: ShiftType,
  dateString: string
): Promise<{ data: Partial<WardForm>; isDraft: boolean } | null> => {
  try {
    const draftId = createDraftId(user.uid, wardId, shift, dateString);
    const draftRef = doc(db, COLLECTION_USER_DRAFTS, draftId);
    const draftSnap = await getDoc(draftRef);
    
    if (!draftSnap.exists()) {
      Logger.info(`[SecureDraft] No draft found in Firebase: ${draftId}`);
      return null;
    }
    
    const draftData = draftSnap.data() as DraftData;
    
    // Check if draft is expired
    const now = new Date();
    const expiryDate = draftData.expiresAt.toDate();
    if (now > expiryDate) {
      Logger.info(`[SecureDraft] Draft expired, removing: ${draftId}`);
      await deleteDoc(draftRef);
      return null;
    }
    
    Logger.info(`[SecureDraft] Loaded from Firebase: ${draftId}`);
    return {
      data: draftData.formData,
      isDraft: draftData.isDraft,
    };
  } catch (error) {
    Logger.error('[SecureDraft] Failed to load from Firebase:', error);
    return null;
  }
};

/**
 * 🔒 ลบ Draft จาก Firebase Firestore
 */
export const removeDraftFromFirebase = async (
  user: User,
  wardId: string,
  shift: ShiftType,
  dateString: string
): Promise<boolean> => {
  try {
    const draftId = createDraftId(user.uid, wardId, shift, dateString);
    const draftRef = doc(db, COLLECTION_USER_DRAFTS, draftId);
    await deleteDoc(draftRef);
    Logger.info(`[SecureDraft] Removed from Firebase: ${draftId}`);
    return true;
  } catch (error) {
    Logger.error('[SecureDraft] Failed to remove from Firebase:', error);
    return false;
  }
};

/**
 * 🔒 ตรวจสอบว่ามี Draft หรือไม่
 */
export const hasDraftInFirebase = async (
  user: User,
  wardId: string,
  shift: ShiftType,
  dateString: string
): Promise<boolean> => {
  const draft = await loadDraftFromFirebase(user, wardId, shift, dateString);
  return draft !== null;
};

/**
 * 🔒 ดึงรายการ Draft ทั้งหมดของ User (ปลอดภัย)
 */
export const getAllUserDraftsFromFirebase = async (user: User): Promise<DraftData[]> => {
  try {
    const draftsRef = collection(db, COLLECTION_USER_DRAFTS);
    const q = query(
      draftsRef,
      where('userId', '==', user.uid),
      where('isDraft', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(50) // จำกัดไม่เกิน 50 รายการ
    );
    
    const querySnapshot = await getDocs(q);
    const drafts: DraftData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DraftData;
      // กรองข้อมูลที่ยังไม่หมดอายุ
      const now = new Date();
      const expiryDate = data.expiresAt.toDate();
      if (now <= expiryDate) {
        drafts.push(data);
      }
    });
    
    Logger.info(`[SecureDraft] Found ${drafts.length} active drafts for user ${user.uid}`);
    return drafts;
  } catch (error) {
    Logger.error('[SecureDraft] Failed to get all drafts from Firebase:', error);
    return [];
  }
};

/**
 * 🔒 ทำความสะอาด Draft ที่หมดอายุ (ทำงานอัตโนมัติ)
 */
export const cleanupExpiredDrafts = async (user: User): Promise<number> => {
  try {
    const allDrafts = await getAllUserDraftsFromFirebase(user);
    const expiredDrafts = allDrafts.filter((draft) => {
      const now = new Date();
      const expiryDate = draft.expiresAt.toDate();
      return now > expiryDate;
    });
    
    let cleanedCount = 0;
    for (const draft of expiredDrafts) {
      const draftRef = doc(db, COLLECTION_USER_DRAFTS, draft.id);
      await deleteDoc(draftRef);
      cleanedCount++;
    }
    
    Logger.info(`[SecureDraft] Cleaned up ${cleanedCount} expired drafts`);
    return cleanedCount;
  } catch (error) {
    Logger.error('[SecureDraft] Failed to cleanup expired drafts:', error);
    return 0;
  }
};

/**
 * 🔒 ตรวจสอบว่าข้อมูล Draft ยังใหม่หรือไม่ (ภายใน 30 นาที)
 */
export const isDraftDataFresh = async (
  user: User,
  wardId: string,
  shift: ShiftType,
  dateString: string,
  maxAgeInMinutes: number = 30
): Promise<boolean> => {
  try {
    const draftId = createDraftId(user.uid, wardId, shift, dateString);
    const draftRef = doc(db, COLLECTION_USER_DRAFTS, draftId);
    const draftSnap = await getDoc(draftRef);
    
    if (!draftSnap.exists()) return false;
    
    const draftData = draftSnap.data() as DraftData;
    const now = new Date();
    const updatedAt = draftData.updatedAt.toDate();
    const ageInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
    
    return ageInMinutes <= maxAgeInMinutes;
  } catch (error) {
    Logger.error('[SecureDraft] Failed to check draft freshness:', error);
    return false;
  }
};
