import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * User roles for role-based access control
 */
export enum UserRole {
  ADMIN = 'admin',
  HEAD_NURSE = 'head_nurse',
  NURSE = 'nurse',
  VIEWER = 'viewer',
  SUPER_ADMIN = 'super_admin',
  DEVELOPER = 'developer',
  APPROVER = 'approver',
  WARD_CLERK = 'ward_clerk',
  SUPERVISOR = 'supervisor'
}

/**
 * สถานะของแบบฟอร์ม
 */
export enum FormStatus {
  DRAFT = 'draft',
  FINAL = 'final',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * ประเภทเวรการทำงาน
 */
export enum ShiftType {
  MORNING = 'morning',
  NIGHT = 'night'
}

/**
 * Timestamp type ที่รองรับทั้ง Firestore Timestamp, serverTimestamp และ string
 */
export type TimestampField =
  | string
  | Date
  | Timestamp
  | FieldValue
  | { toDate(): Date; seconds: number; nanoseconds: number }
  | null;

/**
 * Type สำหรับ ServerTimestamp ที่ใช้กับ Firestore
 */
export type ServerTimestampType = { 
  seconds: null;
  nanoseconds: null;
  isEqual?: Function;
  toDate?: Function;
  valueOf?: Function;
};

/**
 * Basic User interface needed for AuthContext
 */
export interface User {
  uid: string;
  role: UserRole;
  floor?: string | null;
  firstName?: string;
  username?: string;
  lastName?: string;
  displayName?: string;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
  lastUpdated?: TimestampField;
  lastLogin?: TimestampField;
  lastActive?: TimestampField;
  active?: boolean;
  approveWardIds?: string[]; // รายการ ID ของวอร์ดที่ผู้ใช้มีสิทธิ์อนุมัติ
  password?: string; // เพิ่มเพื่อรองรับการใช้งานจาก app/features/auth/types/user.ts
}