import { User, UserRole } from '@/app/features/auth/types/user';
import { db } from '@/app/lib/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Cache สำหรับการตรวจสอบสิทธิ์ ward
const wardAccessCache = new Map<string, { hasAccess: boolean; timestamp: number }>();
// Cache สำหรับ user role
const userRoleCache = new Map<string, { role: UserRole | null; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 วินาที

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
    return false;
  }
  
  // ถ้าไม่กำหนดบทบาทที่ต้องการ แสดงว่าแค่มีบัญชีผู้ใช้ก็พอ
  if (!requiredRole) {
    return true;
  }
  
  // แปลงบทบาทที่ต้องการตรวจสอบเป็นอาร์เรย์
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Admin และ Developer มีสิทธิ์ทั้งหมด
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER) {
    return true;
  }
  
  // ตรวจสอบว่า user.role อยู่ในบทบาทที่กำหนดหรือไม่
  return roles.includes(user.role);
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์ใน ward ที่กำหนดหรือไม่ (พร้อม cache)
 * @param user ข้อมูลผู้ใช้
 * @param wardId รหัส ward ที่ต้องการตรวจสอบ
 * @returns ผลการตรวจสอบสิทธิ์
 */
export const checkWardAccess = (
  user: User | null, 
  wardId: string
): boolean => {
  // ถ้าไม่มีผู้ใช้ ถือว่าไม่มีสิทธิ์
  if (!user || !wardId) {
    return false;
  }
  
  // ตรวจสอบ cache ก่อน
  const cacheKey = `${user.uid}-${wardId}`;
  const cached = wardAccessCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.hasAccess;
  }
  
  let hasAccess = false;
  
  // Admin, Super Admin และ Developer มีสิทธิ์ทุก ward
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER) {
    hasAccess = true;
  }
  // Approver มีสิทธิ์ตาม approveWardIds
  else if (user.role === UserRole.APPROVER && user.approveWardIds) {
    hasAccess = user.approveWardIds.includes(wardId);
  }
  // ตรวจสอบว่าผู้ใช้มี ward ที่กำหนดหรือไม่ (floor property)
  else if (user.floor) {
    hasAccess = user.floor === wardId;
  }
  // หรือตรวจสอบจาก ward permissions อื่นๆ
  else {
    hasAccess = false;
  }
  
  // บันทึกลง cache
  wardAccessCache.set(cacheKey, { hasAccess, timestamp: Date.now() });
  
  return hasAccess;
};

/**
 * ดึง role ของผู้ใช้จาก Firestore (พร้อม cache)
 * @param user ข้อมูลผู้ใช้
 * @returns UserRole หรือ null
 */
export const getUserRole = async (user: User | null): Promise<UserRole | null> => {
  if (!user) {
    return null;
  }

  // ตรวจสอบ cache ก่อน
  const cacheKey = `role-${user.uid}`;
  const cached = userRoleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.role;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const role = userData?.role || null;
    
    // บันทึกลง cache
    userRoleCache.set(cacheKey, { role, timestamp: Date.now() });
    
    return role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * ล้าง cache การตรวจสอบสิทธิ์
 */
export const clearAccessCache = (): void => {
  wardAccessCache.clear();
  userRoleCache.clear();
};

/**
 * ตรวจสอบสิทธิ์ในการเข้าถึงฟีเจอร์เฉพาะ
 * @param user ข้อมูลผู้ใช้
 * @param feature ชื่อฟีเจอร์
 * @param wardId รหัส ward (optional)
 * @returns ผลการตรวจสอบสิทธิ์
 */
export const checkFeatureAccess = (
  user: User | null,
  feature: 'approval' | 'dashboard' | 'form_edit' | 'user_management',
  wardId?: string
): boolean => {
  if (!user) return false;
  
  switch (feature) {
    case 'approval':
      return user.role === UserRole.APPROVER || user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    
    case 'dashboard':
      return true; // ทุกคนที่ล็อกอินแล้วสามารถดู dashboard ได้
    
    case 'form_edit':
      if (!wardId) return false;
      return checkWardAccess(user, wardId);
    
    case 'user_management':
      return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER;
    
    default:
      return false;
  }
}; 