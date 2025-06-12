import { User } from '@/app/core/types/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';

/**
 * ดึงข้อมูลผู้ใช้จาก Firestore ด้วย user ID
 * @param userId รหัสผู้ใช้
 * @returns ข้อมูลผู้ใช้หรือ null ถ้าไม่พบ
 */
export const getUserDirectly = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log(`[Auth] User with ID ${userId} not found`);
      return null;
    }
    
    return {
      ...userDoc.data() as User,
      uid: userDoc.id
    };
  } catch (error) {
    console.error('[Auth] Error fetching user:', error);
    return null;
  }
};

/**
 * ตรวจสอบความถูกต้องของ token และดึงข้อมูลผู้ใช้
 * @param token Firebase JWT token
 * @returns ข้อมูลผู้ใช้หรือ null ถ้าไม่ถูกต้อง
 */
export const verifyApiToken = async (token: string): Promise<User | null> => {
  try {
    // ในระบบนี้เราใช้ user.uid เป็น token โดยตรง
    // ดึงข้อมูลผู้ใช้จาก Firestore โดยตรง
    const user = await getUserDirectly(token);
    
    if (!user) {
      console.error('[Auth] User not found in database');
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('[Auth] Error verifying token:', error);
    return null;
  }
};
