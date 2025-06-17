import { doc, getDoc } from 'firebase/firestore';
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