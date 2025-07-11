// This is a placeholder for a future notification service.
// It can be expanded to handle various types of notifications (e.g., toast, push, etc.).

import { db } from '@/app/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Notification, NotificationType } from '../types';
import { Logger } from '@/app/lib/utils/logger';

const NOTIFICATIONS_COLLECTION = 'notifications';

interface UserNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

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

      // ✅ Firebase-Safe Data Preparation - กรอง undefined values
      const sanitizedData = {
        ...notificationData,
        createdAt: serverTimestamp(),
        // Initialize all recipients as unread
        isRead: notificationData.recipientIds.reduce((acc, userId) => {
          acc[userId] = false;
          return acc;
        }, {} as { [userId: string]: boolean }),
      };

      // ✅ Remove undefined fields to prevent Firebase errors
      Object.keys(sanitizedData).forEach(key => {
        if ((sanitizedData as any)[key] === undefined) {
          delete (sanitizedData as any)[key];
        }
      });

      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), sanitizedData);

      Logger.info(`[${context}] Successfully created notification with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      Logger.error(`[${context}] Error creating notification:`, error);
      // Depending on the application's needs, you might want to re-throw the error
      // or handle it gracefully. For now, we'll throw it to let the caller know.
      throw new Error('Failed to create notification.');
    }
  },

  /**
   * Fetches the CSRF token from the server.
   * It first checks sessionStorage and returns the token if found.
   * @returns The CSRF token or null if failed.
   */
  async getCsrfToken(): Promise<string | null> {
    try {
      const existingToken = sessionStorage.getItem('csrfToken');
      if (existingToken) {
        return existingToken;
      }
      const response = await fetch('/api/auth/csrf');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.csrfToken) {
        sessionStorage.setItem('csrfToken', data.csrfToken);
        return data.csrfToken;
      }
      return null;
    } catch (error) {
      Logger.error('[NotificationService] Failed to fetch CSRF token:', error);
      return null;
    }
  },

  /**
   * Fetches notifications for the current user.
   * @returns An object containing the list of notifications and the unread count.
   */
  async getUserNotifications(): Promise<UserNotificationsResponse> {
    try {
      // ใช้ BASE_URL จาก environment variable
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/notifications/get`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch notifications`);
      }
      const data = await response.json();
      if (data.success) {
        return {
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
        };
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (error) {
      Logger.error('[NotificationService] Fetch notifications failed:', error);
      throw error;
    }
  },

  /**
   * Marks a single notification as read.
   * @param notificationId - The ID of the notification to mark as read.
   * @param csrfToken - The CSRF token for security.
   * @returns True if successful, false otherwise.
   */
  async markNotificationAsRead(notificationId: string, csrfToken: string): Promise<boolean> {
    return this.markAsReadRequest({ notificationId }, csrfToken);
  },

  /**
   * Marks all unread notifications as read for the user.
   * @param csrfToken - The CSRF token for security.
   * @returns True if successful, false otherwise.
   */
  async markAllNotificationsAsRead(csrfToken: string): Promise<boolean> {
    return this.markAsReadRequest({ all: true }, csrfToken);
  },

  /**
   * Deletes a single notification for the current user.
   * @param notificationId - The ID of the notification to delete.
   * @param csrfToken - The CSRF token for security.
   * @returns Object with success status and message.
   */
  async deleteNotification(notificationId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
    return this.deleteRequest({ notificationId }, csrfToken);
  },

  /**
   * Deletes all notifications for the current user.
   * @param csrfToken - The CSRF token for security.
   * @returns Object with success status, message, and deletion count.
   */
  async deleteAllNotifications(csrfToken: string): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    return this.deleteRequest({ all: true }, csrfToken);
  },

  /**
   * Deletes notifications by type for the current user.
   * @param type - The notification type to delete.
   * @param csrfToken - The CSRF token for security.
   * @returns Object with success status, message, and deletion count.
   */
  async deleteNotificationsByType(type: NotificationType, csrfToken: string): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    return this.deleteRequest({ type }, csrfToken);
  },
  
  /**
   * Unified private method to handle mark-as-read requests.
   * @param payload - The request payload.
   * @param csrfToken - The CSRF token.
   * @returns True if successful, false otherwise.
   * @private
   */
  async markAsReadRequest(
    payload: { notificationId?: string; all?: boolean },
    csrfToken: string
  ): Promise<boolean> {
    if (!csrfToken) {
      Logger.error('[NotificationService] CSRF Token not available for markAsReadRequest.');
      throw new Error('CSRF Token is missing.');
    }

    try {
      const response = await fetch('/api/notifications/markAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      } else {
        const errorText = await response.text();
        Logger.error(`[NotificationService] Mark as read failed with status ${response.status}`, errorText);
        // We throw an error so the calling hook can catch it and set state
        throw new Error(`Failed to mark as read. Status: ${response.status}`);
      }
    } catch (error) {
      Logger.error('[NotificationService] Mark as read request failed:', error);
      throw error; // Re-throw to be handled by the caller
    }
  },

  /**
   * Unified private method to handle delete requests.
   * @param payload - The request payload.
   * @param csrfToken - The CSRF token.
   * @returns Object with success status, message, and optional count.
   * @private
   */
  async deleteRequest(
    payload: { notificationId?: string; all?: boolean; type?: NotificationType },
    csrfToken: string
  ): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    if (!csrfToken) {
      Logger.error('[NotificationService] CSRF Token not available for deleteRequest.');
      throw new Error('CSRF Token is missing.');
    }

    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: data.success,
          message: data.message,
          deletedCount: data.deletedCount
        };
      } else {
        const errorText = await response.text();
        Logger.error(`[NotificationService] Delete request failed with status ${response.status}`, errorText);
        throw new Error(`Failed to delete notifications. Status: ${response.status}`);
      }
    } catch (error) {
      Logger.error('[NotificationService] Delete request failed:', error);
      throw error; // Re-throw to be handled by the caller
    }
  },
};

export default notificationService;
export { NotificationType }; 