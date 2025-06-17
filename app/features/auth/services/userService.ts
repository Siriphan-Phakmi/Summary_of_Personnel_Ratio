import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    // เราใช้ setDoc แทน addDoc เพื่อให้ใช้ uid เป็น Document ID ได้
    await setDoc(userRef, {
      ...userData,
      uid, // บันทึก uid ลงใน document ด้วยเพื่อความสะดวกในการ query
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
    }, { merge: true }); // ใช้ merge: true เพื่อให้เป็นการ update ถ้ามีข้อมูลอยู่แล้ว
    console.log(`[userService] User with ID ${uid} created/updated successfully.`);
  } catch (error) {
    console.error(`[userService] Error creating/updating user for ID ${uid}:`, error);
    throw error; // ส่งต่อ error ให้ส่วนที่เรียกใช้จัดการ
  }
}; 