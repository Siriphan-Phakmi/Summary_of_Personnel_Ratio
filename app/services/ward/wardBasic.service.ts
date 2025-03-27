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
  addDoc
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { Ward } from '@/app/types/ward';

// Ward collection name
const WARDS_COLLECTION = 'wards';

/**
 * Get all wards
 * @returns Promise with all wards
 */
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
 * @param createdBy User ID of creator
 * @returns New ward ID
 */
export const createWard = async (
  name: string,
  description: string,
  createdBy: string
): Promise<string> => {
  try {
    // Check if ward with the same name already exists
    const existingWardQuery = query(
      collection(db, WARDS_COLLECTION),
      where('name', '==', name)
    );
    const existingWardSnapshot = await getDocs(existingWardQuery);
    
    if (!existingWardSnapshot.empty) {
      throw new Error('Ward with this name already exists');
    }
    
    const wardRef = await addDoc(collection(db, WARDS_COLLECTION), {
      name,
      description,
      createdBy,
      createdAt: new Date(),
      active: true
    });
    
    return wardRef.id;
  } catch (error) {
    console.error('Error creating ward:', error);
    throw error;
  }
};

/**
 * Update ward data
 * @param id Ward ID
 * @param data Ward data to update
 */
export const updateWard = async (
  id: string,
  data: Partial<Ward>
): Promise<void> => {
  try {
    const wardRef = doc(db, WARDS_COLLECTION, id);
    
    await updateDoc(wardRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating ward:', error);
    throw error;
  }
}; 