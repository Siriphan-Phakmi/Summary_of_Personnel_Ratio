import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/features/auth';
import { Notification, NotificationType } from '../types'; // Import from centralized types
import notificationService from '../services/NotificationService'; // Import the service
import { Logger } from '@/app/lib/utils/logger'; // Import centralized logger

// Define a client-specific interface for notifications to handle the isRead boolean
interface UINotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: any;
  actionUrl?: string;
}

export interface NotificationBellState {
  notifications: UINotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useNotificationBell = (isOpen: boolean) => {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationBellState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  });
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  
  const fetchingNotifications = useRef<boolean>(false);

  // Get CSRF Token
  useEffect(() => {
    const initCsrfToken = async () => {
      if (!user || csrfToken) return;
      
      const token = await notificationService.getCsrfToken();
      if (token) {
        setCsrfToken(token);
      } else {
        Logger.error('Failed to initialize CSRF token in hook');
      }
    };
    
    initCsrfToken();
  }, [user, csrfToken]);

  // Fetch notifications function
  const fetchNotifications = useCallback(async () => {
    if (!user || fetchingNotifications.current) return;
    
    fetchingNotifications.current = true;
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const { notifications, unreadCount } = await notificationService.getUserNotifications();
      // The API is expected to have transformed the isRead map to a boolean for the current user.
      // We cast here to align the Firestore document type with the client-side UI type.
      setState(s => ({ ...s, notifications: notifications as any as UINotification[], unreadCount, isLoading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์';
      setState(s => ({ ...s, error: errorMessage, isLoading: false, notifications: [], unreadCount: 0 }));
      Logger.error('useNotificationBell: Fetch notifications failed', err);
      
      // เพิ่ม retry หลังจาก 5 วินาที
      setTimeout(() => {
        fetchNotifications();
      }, 5000);
    } finally {
      fetchingNotifications.current = false;
    }
  }, [user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!csrfToken) {
      Logger.error('Cannot mark as read, CSRF Token not available');
      return;
    }
    
    try {
      const success = await notificationService.markNotificationAsRead(notificationId, csrfToken);
      if (success) {
        setState(s => ({
          ...s,
          notifications: s.notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, s.unreadCount - 1)
        }));
      }
    } catch (err) {
       setState(s => ({ ...s, error: 'ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้' }));
    }
  }, [csrfToken]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (state.unreadCount === 0 || !csrfToken) return;
    
    setState(s => ({ ...s, error: null }));
    try {
      const success = await notificationService.markAllNotificationsAsRead(csrfToken);
      if (success) {
        setState(s => ({
          ...s,
          notifications: s.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      }
    } catch (err) {
       setState(s => ({ ...s, error: 'ไม่สามารถทำเครื่องหมายทั้งหมดว่าอ่านแล้วได้' }));
    }
  }, [csrfToken, state.unreadCount]);

  // Delete single notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!csrfToken) {
      Logger.error('Cannot delete notification, CSRF Token not available');
      return;
    }
    
    setState(s => ({ ...s, error: null }));
    try {
      const result = await notificationService.deleteNotification(notificationId, csrfToken);
      if (result.success) {
        setState(s => {
          const deletedNotification = s.notifications.find(n => n.id === notificationId);
          const wasUnread = deletedNotification && !deletedNotification.isRead;
          
          return {
            ...s,
            notifications: s.notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount
          };
        });
      }
    } catch (err) {
      setState(s => ({ ...s, error: 'ไม่สามารถลบการแจ้งเตือนได้' }));
      Logger.error('Delete notification failed:', err);
    }
  }, [csrfToken]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (state.notifications.length === 0 || !csrfToken) return;
    
    setState(s => ({ ...s, error: null }));
    try {
      const result = await notificationService.deleteAllNotifications(csrfToken);
      if (result.success) {
        setState(s => ({
          ...s,
          notifications: [],
          unreadCount: 0,
        }));
      }
    } catch (err) {
      setState(s => ({ ...s, error: 'ไม่สามารถลบการแจ้งเตือนทั้งหมดได้' }));
      Logger.error('Delete all notifications failed:', err);
    }
  }, [csrfToken, state.notifications.length]);

  // Delete notifications by type
  const deleteNotificationsByType = useCallback(async (type: NotificationType) => {
    if (!csrfToken) {
      Logger.error('Cannot delete notifications by type, CSRF Token not available');
      return;
    }
    
    setState(s => ({ ...s, error: null }));
    try {
      const result = await notificationService.deleteNotificationsByType(type, csrfToken);
      if (result.success) {
        setState(s => {
          const remainingNotifications = s.notifications.filter(n => n.type !== type);
          const deletedUnreadCount = s.notifications.filter(n => n.type === type && !n.isRead).length;
          
          return {
            ...s,
            notifications: remainingNotifications,
            unreadCount: Math.max(0, s.unreadCount - deletedUnreadCount)
          };
        });
      }
    } catch (err) {
      setState(s => ({ ...s, error: 'ไม่สามารถลบการแจ้งเตือนตามประเภทได้' }));
      Logger.error('Delete notifications by type failed:', err);
    }
  }, [csrfToken]);

  // Auto-fetch when dropdown opens and poll while open
  useEffect(() => {
    if (!user || !isOpen) return;
    
    fetchNotifications();
    
    const intervalId = setInterval(fetchNotifications, 180000); // Poll every 3 minutes
    
    return () => clearInterval(intervalId);
  }, [user, isOpen, fetchNotifications]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    deleteNotificationsByType,
  };
}; 