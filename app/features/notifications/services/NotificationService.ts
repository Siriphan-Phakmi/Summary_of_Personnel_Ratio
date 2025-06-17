// This is a placeholder for a future notification service.
// It can be expanded to handle various types of notifications (e.g., toast, push, etc.).

import { db } from '@/app/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Notification, NotificationType } from '../types';
import { Logger } from '@/app/lib/utils/logger';

const NOTIFICATIONS_COLLECTION = 'notifications';

const notificationService = {
  /**
   * Creates a new notification in Firestore.
   * @param notificationData - The data for the notification to be created.
   * @returns The ID of the newly created notification document.
   */
  async createNotification(
    notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<string> {
    const context = `createNotification-${notificationData.type}`;
    try {
      Logger.info(`[${context}] Creating notification for recipients:`, notificationData.recipientIds);

      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        ...notificationData,
        createdAt: serverTimestamp(),
        // Initialize all recipients as unread
        isRead: notificationData.recipientIds.reduce((acc, userId) => {
          acc[userId] = false;
          return acc;
        }, {} as { [userId: string]: boolean }),
      });

      Logger.info(`[${context}] Successfully created notification with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      Logger.error(`[${context}] Error creating notification:`, error);
      // Depending on the application's needs, you might want to re-throw the error
      // or handle it gracefully. For now, we'll throw it to let the caller know.
      throw new Error('Failed to create notification.');
    }
  },

  // ... other methods like markAsRead, getUserNotifications, etc. can be added here
};

export default notificationService;
export { NotificationType }; 