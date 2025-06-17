/**
 * User interface สำหรับระบบ authentication
 * (สร้างขึ้นใหม่แทนการ re-export จากไฟล์ที่ไม่มีอยู่)
 */

export enum UserRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  DEVELOPER = 'developer',
  NURSE = 'nurse',
  APPROVER = 'approver',
  WARD_CLERK = 'ward_clerk',
  HEAD_NURSE = 'head_nurse',
  SUPERVISOR = 'supervisor',
  USER = 'user', // Default role
}

export interface User {
  uid: string;
  username: string;
  role: UserRole; // ใช้ enum แทน string
  firstName?: string;
  lastName?: string;
  floor?: string;
  ward?: string;
  approveWardIds?: string[]; // เพิ่ม field สำหรับ approver
  email?: string;
  isActive?: boolean;
  lastLogin?: any; // Timestamp or Date
  createdAt?: any; // Timestamp or Date
}