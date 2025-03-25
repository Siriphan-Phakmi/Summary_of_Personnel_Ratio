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
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  UserCredential,
  deleteUser,
} from 'firebase/auth';
import { db, auth } from '@/app/lib/firebase';
import { WardUser } from '@/app/types/ward';
import { serverTimestamp } from 'firebase/firestore';

// Collection name
const USERS_COLLECTION = 'users';

// Get all users
export const getAllUsers = async (): Promise<WardUser[]> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const users: WardUser[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as WardUser;
      users.push({
        ...userData,
        uid: doc.id,
      });
    });

    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (uid: string): Promise<WardUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    
    if (userDoc.exists()) {
      return {
        ...userDoc.data(),
        uid: userDoc.id,
      } as WardUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

// Get users by ward
export const getUsersByWard = async (wardId: string): Promise<WardUser[]> => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('wards', 'array-contains', wardId),
      where('active', '==', true)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    return usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as WardUser));
  } catch (error) {
    console.error(`Error fetching users for ward ${wardId}:`, error);
    throw error;
  }
};

// Create new user
export const createUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'admin' | 'user',
  wards: string[],
  createdBy: string
): Promise<string> => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Add user to Firestore with additional info
    await setDoc(doc(db, USERS_COLLECTION, user.uid), {
      uid: user.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
      wards: wards,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: createdBy,
      lastLogin: null,
    });

    return user.uid;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (
  uid: string,
  data: Partial<WardUser>
): Promise<string> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    // Add timestamp
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, updateData);
    
    return uid;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Deactivate user
export const deactivateUser = async (uid: string): Promise<string> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    await updateDoc(userRef, {
      active: false,
      updatedAt: serverTimestamp(),
    });
    
    return uid;
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
};

// Reactivate user
export const reactivateUser = async (uid: string): Promise<string> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    await updateDoc(userRef, {
      active: true,
      updatedAt: serverTimestamp(),
    });
    
    return uid;
  } catch (error) {
    console.error('Error reactivating user:', error);
    throw error;
  }
};

// Check if user has access to a specific ward
export const hasWardAccess = async (
  uid: string,
  wardId: string
): Promise<boolean> => {
  try {
    const user = await getUserById(uid);
    
    if (!user || !user.active) {
      return false;
    }
    
    // Admins have access to all wards
    if (user.role === 'admin') {
      return true;
    }
    
    return user.wards.includes(wardId);
  } catch (error) {
    console.error(`Error checking ward access for user ${uid}:`, error);
    throw error;
  }
}; 