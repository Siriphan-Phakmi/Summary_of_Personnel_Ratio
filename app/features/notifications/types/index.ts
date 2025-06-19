import { NotificationType } from './notification';

export { NotificationType };

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