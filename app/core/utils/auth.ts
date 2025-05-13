import { auth } from '@/app/core/firebase/firebase';
import { User } from '@/app/core/types/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';

/**
 * ดึงข้อมูลผู้ใช้จาก Firestore ด้วย user ID
 * @param userId รหัสผู้ใช้
 * @returns ข้อมูลผู้ใช้หรือ null ถ้าไม่พบ
 */
const getUserDirectly = async (userId: string): Promise<User | null> => {
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
    // ตรวจสอบ token กับ Firebase Auth (ใช้ getAuth().verifyIdToken)
    // ต้องใช้ admin SDK แต่ถ้ายังไม่มี ให้ใช้วิธีนี้ก่อน
    try {
      // Simulate token verification for now
      const userId = token.split('.')[0]; // ดึง user ID จาก token (ชั่วคราว)
      
      // ดึงข้อมูลผู้ใช้จาก Firestore โดยตรง
      const user = await getUserDirectly(userId);
      
      if (!user) {
        console.error('[Auth] User not found in database');
        return null;
      }
      
      return user;
    } catch (tokenError) {
      console.error('[Auth] Token verification failed:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('[Auth] Error verifying token:', error);
    return null;
  }
};
