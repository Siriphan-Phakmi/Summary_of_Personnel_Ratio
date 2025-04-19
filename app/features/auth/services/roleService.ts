import { User, UserRole } from '@/app/core/types/user';
import { db } from '@/app/core/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์ในบทบาทที่กำหนดหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @param requiredRole บทบาทที่ต้องการตรวจสอบ (อาจเป็นค่าเดียวหรือหลายค่า)
 * @returns ผลการตรวจสอบสิทธิ์
 */
export const checkUserRole = (
  user: User | null, 
  requiredRole?: string | string[]
): boolean => {
  // ถ้าไม่มีผู้ใช้ ถือว่าไม่มีสิทธิ์
  if (!user) {
    console.log('[Role Debug] User is null, no access granted');
    return false;
  }
  
  // ถ้าไม่กำหนดบทบาทที่ต้องการ แสดงว่าแค่มีบัญชีผู้ใช้ก็พอ
  if (!requiredRole) {
    console.log('[Role Debug] No required role specified, access granted');
    return true;
  }
  
  // แปลงบทบาทที่ต้องการตรวจสอบเป็นอาร์เรย์
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // ตรวจสอบว่า user.role อยู่ในบทบาทที่กำหนดหรือไม่
  const hasAccess = roles.includes(user.role);
  console.log('[Role Debug] Role check:', {
    userRole: user.role,
    requiredRoles: roles,
    hasAccess
  });
  
  return hasAccess;
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์ใน ward ที่กำหนดหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @param wardId รหัส ward ที่ต้องการตรวจสอบ
 * @returns ผลการตรวจสอบสิทธิ์
 */
export const checkWardAccess = (
  user: User | null, 
  wardId: string
): boolean => {
  // ถ้าไม่มีผู้ใช้ ถือว่าไม่มีสิทธิ์
  if (!user) {
    return false;
  }
  
  // ถ้าเป็น admin มีสิทธิ์ทุก ward
  if (user.role === 'admin') {
    return true;
  }
  
  // ตรวจสอบว่าผู้ใช้มี ward ที่กำหนดหรือไม่
  return !!user.location?.includes(wardId);
};

export const getUserRole = async (user: User | null): Promise<UserRole | null> => {
  if (!user) {
    console.log('No user provided to getUserRole');
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log('User document not found for role check');
      return null;
    }

    const userData = userDoc.data();
    return userData?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}; 