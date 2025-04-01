import { User } from '@/app/core/types/user';

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
  
  // ตรวจสอบว่า user.role อยู่ในบทบาทที่กำหนดหรือไม่
  return roles.includes(user.role);
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