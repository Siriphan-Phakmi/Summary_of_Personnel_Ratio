export enum NotificationType {
  GENERAL = 'general',
  FORM_SUBMITTED = 'form_submitted',
  FORM_APPROVED = 'form_approved',
  FORM_REJECTED = 'form_rejected',
  SYSTEM_ALERT = 'system_alert',
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  recipientIds: string[]; // Array of user UIDs
  isRead: { [userId: string]: boolean }; // Map to track read status per user
  createdAt: any; // Firestore Timestamp
  createdBy: string; // User UID
  relatedDocId?: string; // e.g., formId
  actionUrl?: string; // URL to navigate to on click
} 