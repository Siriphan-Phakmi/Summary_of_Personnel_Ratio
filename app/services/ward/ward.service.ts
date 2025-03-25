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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { Ward } from '@/app/types/ward';

// Collection name
const WARDS_COLLECTION = 'wards';

/**
 * Get all wards
 * @returns List of wards
 */
export const getAllWards = async (): Promise<Ward[]> => {
  try {
    const wardsRef = collection(db, WARDS_COLLECTION);
    const q = query(wardsRef, where('active', '==', true), orderBy('name'));
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

/**
 * Get ward by ID
 * @param id Ward ID
 * @returns Ward data
 */
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

/**
 * Create a new ward
 * @param name Ward name
 * @param description Ward description
 * @param createdBy User ID who created the ward
 * @returns Ward ID
 */
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
      active: true,
      createdAt: serverTimestamp(),
      createdBy,
    });
    
    return wardRef.id;
  } catch (error) {
    console.error('Error creating ward:', error);
    throw error;
  }
};

/**
 * Update ward
 * @param id Ward ID
 * @param data Ward data to update
 */
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