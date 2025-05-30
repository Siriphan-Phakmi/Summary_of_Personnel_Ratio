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
  APPROVER = 'approver'
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
export type TimestampField = string | Date | {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
} | {
  _seconds?: number;
  _nanoseconds?: number;
} | null | {
  isEqual?: Function;
  valueOf?: Function;
};

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
  role: UserRole | string;
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
}