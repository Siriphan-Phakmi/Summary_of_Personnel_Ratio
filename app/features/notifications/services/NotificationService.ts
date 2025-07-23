// This is a placeholder for a future notification service.
// It can be expanded to handle various types of notifications (e.g., toast, push, etc.).

import { db } from '@/app/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { Notification, UserNotification, NotificationType } from '../types';
import { Logger } from '@/app/lib/utils/logger';

// In-memory deduplication cache
const notificationCache = new Map<string, number>();
const NOTIFICATION_CACHE_DURATION = 60000; // 1 minute

// Generate notification hash for deduplication (UTF-8 safe)
const generateNotificationHash = (data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): string => {
  const hashContent = {
    type: data.type,
    title: data.title,
    message: data.message,
    recipientIds: data.recipientIds.sort(), // Sort for consistent hashing
    actionUrl: data.actionUrl || '',
    senderId: data.sender?.id || ''
  };
  
  // UTF-8 safe base64 encoding
  const jsonString = JSON.stringify(hashContent);
  const utf8Bytes = new TextEncoder().encode(jsonString);
  const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

// Clean expired cache entries
const cleanNotificationCache = () => {
  const now = Date.now();
  notificationCache.forEach((timestamp, hash) => {
    if (now - timestamp > NOTIFICATION_CACHE_DURATION) {
      notificationCache.delete(hash);
    }
  });
};

const NOTIFICATIONS_COLLECTION = 'notifications';

interface UserNotificationsResponse {
  notifications: UserNotification[];
  unreadCount: number;
}

const notificationService = {
  /**
   * Creates a new notification in Firestore with deduplication.
   * @param notificationData - The data for the notification to be created.
   * @returns The ID of the newly created notification document.
   */
  async createNotification(
    notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<string> {
    const context = `createNotification-${notificationData.type}`;
    
    try {
      Logger.info(`[${context}] Creating notification for recipients:`, notificationData.recipientIds);

      // Generate hash for deduplication
      const notificationHash = generateNotificationHash(notificationData);
      const now = Date.now();
      
      // Clean expired cache
      cleanNotificationCache();
      
      // Check in-memory cache for recent duplicates
      const cachedTimestamp = notificationCache.get(notificationHash);
      if (cachedTimestamp && (now - cachedTimestamp) < NOTIFICATION_CACHE_DURATION) {
        Logger.warn(`[${context}] Duplicate notification detected (cached), skipping creation`);
        return 'duplicate'; // Don't throw error, return special ID
      }
      
      // Check Firestore for recent duplicates (last 5 minutes)
      const fiveMinutesAgo = new Date(now - 300000); // 5 minutes
      const duplicateQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('type', '==', notificationData.type),
        where('title', '==', notificationData.title),
        where('message', '==', notificationData.message),
        where('createdAt', '>', fiveMinutesAgo),
        limit(1)
      );
      
      const duplicateSnapshot = await getDocs(duplicateQuery);
      if (!duplicateSnapshot.empty) {
        // Check if recipients match
        const existingDoc = duplicateSnapshot.docs[0];
        const existingData = existingDoc.data();
        const existingRecipients = existingData.recipientIds || [];
        
        const hasMatchingRecipients = notificationData.recipientIds.some(id => 
          existingRecipients.includes(id)
        );
        
        if (hasMatchingRecipients) {
          Logger.warn(`[${context}] Duplicate notification detected in Firestore, skipping creation`);
          notificationCache.set(notificationHash, now);
          return existingDoc.id; // Return existing notification ID
        }
      }

      // ✅ Firebase-Safe Data Preparation - กรอง undefined values
      const sanitizedData = {
        ...notificationData,
        createdAt: serverTimestamp(),
        notificationHash, // Store hash for future reference
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
      
      // Cache this notification to prevent immediate duplicates
      notificationCache.set(notificationHash, now);

      Logger.info(`[${context}] Successfully created notification with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      // Don't throw for any errors, just log them and continue
      Logger.error(`[${context}] Failed to create notification, continuing execution:`, error);
      return 'failed'; // Return a special ID for failures
    }
  },

  /**
   * Fetches the CSRF token from the server (ไม่ใช้ sessionStorage)
   * @returns The CSRF token or null if failed.
   */
  async getCsrfToken(): Promise<string | null> {
    try {
      // ✅ ไม่ใช้ sessionStorage แล้ว - ขอ token ใหม่ทุกครั้ง
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include', // ✅ Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.csrfToken) {
        // ใช้ server-side CSRF protection แทน browser storage
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
      console.log('[DEBUG NotificationService] Starting getUserNotifications()');
      // ใช้ BASE_URL จาก environment variable
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      console.log('[DEBUG NotificationService] Making request to:', `${baseUrl}/api/notifications/get`);
      
      const response = await fetch(`${baseUrl}/api/notifications/get`, {
        method: 'GET',
        credentials: 'include', // ✅ Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[DEBUG NotificationService] Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch notifications`);
      }
      const data = await response.json();
      console.log('[DEBUG NotificationService] Response data:', data);
      
      if (data.success) {
        console.log(`[DEBUG NotificationService] Success! ${data.notifications?.length || 0} notifications, ${data.unreadCount || 0} unread`);
        return {
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
        };
      } else {
        console.error('[DEBUG NotificationService] API returned error:', data.error);
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
        credentials: 'include', // ✅ Include cookies for authentication
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
        credentials: 'include', // ✅ Include cookies for authentication
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
        Logger.error(`[NotificationService] Delete request failed with status ${response.status} "${errorText}"`);
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