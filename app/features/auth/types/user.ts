/**
 * User interface สำหรับระบบ authentication
 * (สร้างขึ้นใหม่แทนการ re-export จากไฟล์ที่ไม่มีอยู่)
 */

export enum UserRole {
  NURSE = 'nurse',
  APPROVER = 'approver',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
}

export interface User {
  uid: string;
  username: string;
  role: UserRole; // ใช้ enum แทน string
  firstName?: string;
  lastName?: string;
  floor?: string;
  ward?: string;
  assignedWardId?: string | string[]; // เพิ่ม field สำหรับ nurse/user
  approveWardIds?: string[]; // เพิ่ม field สำหรับ approver
  email?: string;
  isActive?: boolean;
  lastLogin?: any; // Timestamp or Date
  createdAt?: any; // Timestamp or Date
}