import { Timestamp } from 'firebase/firestore';

export enum NotificationType {
  GENERAL = 'GENERAL',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  FORM_APPROVED = 'FORM_APPROVED',
  FORM_REJECTED = 'FORM_REJECTED',
  FORM_DRAFT_SAVED = 'FORM_DRAFT_SAVED',
  FORM_FINALIZED = 'FORM_FINALIZED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  USER_MENTION = 'USER_MENTION',
  INFO = 'INFO', // ✅ เพิ่มสำหรับข้อมูลทั่วไป
  WARNING = 'WARNING', // ✅ เพิ่มสำหรับการเตือน
}

// Notification interface สำหรับการสร้าง notification ใหม่
export interface Notification {
  id?: string;
  recipientIds: string[]; // เปลี่ยนเป็น array สำหรับ multiple recipients
  type: NotificationType;
  title: string;
  message: string;
  isRead: { [userId: string]: boolean }; // Map ของ userId กับ read status
  createdAt: Timestamp;
  actionUrl?: string;
  sender?: {
    id: string;
    name: string;
  };
}

// Interface สำหรับ API response ที่แปลง isRead เป็น boolean สำหรับ user ปัจจุบัน
export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean; // Boolean สำหรับ user ปัจจุบัน
  createdAt: Timestamp;
  actionUrl?: string;
  sender?: {
    id: string;
    name: string;
  };
}