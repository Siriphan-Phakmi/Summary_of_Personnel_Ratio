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
  assignedWardId?: string; // NURSE will have a single assigned ward
  approveWardIds?: string[]; // APPROVER can have multiple wards
  email?: string;
  isActive?: boolean;
  lastLogin?: any; // Timestamp or Date
  createdAt?: any; // Timestamp or Date
  updatedAt?: any; // Timestamp or Date - เพิ่มฟิลด์วันที่แก้ไข
}