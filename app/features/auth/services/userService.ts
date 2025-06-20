import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { User } from '@/app/features/auth/types/user';

/**
 * ดึงข้อมูลผู้ใช้จาก Firestore ด้วย user ID
 * @param userId รหัสผู้ใช้
 * @returns ข้อมูลผู้ใช้หรือ null ถ้าไม่พบ
 */
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log(`[userService] User with ID ${userId} not found`);
      return null;
    }
    
    return {
      ...userDoc.data() as User,
      uid: userDoc.id
    };
  } catch (error) {
    console.error('[userService] Error fetching user:', error);
    return null;
  }
};

/**
 * สำหรับแทน getUserById ที่อาจมีใช้ที่อื่น
 */
export const getUserById = getUser;

/**
 * สร้างหรืออัปเดตข้อมูลผู้ใช้ใน Firestore
 * @param uid รหัสผู้ใช้จาก Firebase Authentication
 * @param userData ข้อมูลผู้ใช้ที่ต้องการบันทึก
 * @returns {Promise<void>}
 */
export const upsertUser = async (uid: string, userData: Omit<User, 'uid'>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const now = new Date();
    
    // เราใช้ setDoc แทน addDoc เพื่อให้ใช้ uid เป็น Document ID ได้
    await setDoc(userRef, {
      ...userData,
      uid, // บันทึก uid ลงใน document ด้วยเพื่อความสะดวกในการ query
      createdAt: userData.createdAt || now,
      updatedAt: now,
      isActive: userData.isActive ?? true, // ตั้งค่าเริ่มต้นเป็น active
    }, { merge: true }); // ใช้ merge: true เพื่อให้เป็นการ update ถ้ามีข้อมูลอยู่แล้ว
    console.log(`[userService] User with ID ${uid} created/updated successfully.`);
  } catch (error) {
    console.error(`[userService] Error creating/updating user for ID ${uid}:`, error);
    throw error; // ส่งต่อ error ให้ส่วนที่เรียกใช้จัดการ
  }
};

/**
 * ดึงรายการผู้ใช้ทั้งหมดจาก Firestore
 * @returns Promise<User[]> รายการผู้ใช้ทั้งหมด
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    return snapshot.docs.map(doc => ({
      ...doc.data() as User,
      uid: doc.id
    }));
  } catch (error) {
    console.error('[userService] Error fetching all users:', error);
    throw error;
  }
};

/**
 * อัปเดตข้อมูลผู้ใช้
 * @param uid รหัสผู้ใช้
 * @param updateData ข้อมูลที่ต้องการอัปเดต
 * @returns Promise<void>
 */
export const updateUser = async (uid: string, updateData: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const now = new Date();
    
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: now,
    });
    
    console.log(`[userService] User with ID ${uid} updated successfully.`);
  } catch (error) {
    console.error(`[userService] Error updating user for ID ${uid}:`, error);
    throw error;
  }
};

/**
 * ลบผู้ใช้
 * @param uid รหัสผู้ใช้
 * @returns Promise<void>
 */
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    
    console.log(`[userService] User with ID ${uid} deleted successfully.`);
  } catch (error) {
    console.error(`[userService] Error deleting user for ID ${uid}:`, error);
    throw error;
  }
};

/**
 * เปิดใช้งาน/ปิดใช้งานผู้ใช้
 * @param uid รหัสผู้ใช้
 * @param isActive สถานะการใช้งาน
 * @returns Promise<void>
 */
export const toggleUserStatus = async (uid: string, isActive: boolean): Promise<void> => {
  try {
    await updateUser(uid, { isActive });
    console.log(`[userService] User ${uid} ${isActive ? 'activated' : 'deactivated'} successfully.`);
  } catch (error) {
    console.error(`[userService] Error toggling user status for ID ${uid}:`, error);
    throw error;
  }
};

/**
 * ค้นหาผู้ใช้ตาม username
 * @param username ชื่อผู้ใช้
 * @returns Promise<User | null>
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('username', '==', username));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      ...doc.data() as User,
      uid: doc.id
    };
  } catch (error) {
    console.error('[userService] Error fetching user by username:', error);
    throw error;
  }
}; 