import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/app/core/services/NotificationService';
import { useAuth } from '@/app/features/auth';

export interface NotificationBellState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  csrfToken: string | null;
}

export interface NotificationBellActions {
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

export const useNotificationBell = (isOpen: boolean): NotificationBellState & NotificationBellActions => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF Token when user logs in
  useEffect(() => {
    const fetchCsrfToken = async () => {
      if (user && !csrfToken) {
        try {
          const res = await fetch('/api/auth/csrf');
          if (res.ok) {
            const data = await res.json();
            setCsrfToken(data.csrfToken);
          } else {
            console.error('[useNotificationBell] Failed to fetch CSRF token:', res.statusText);
          }
        } catch (err) {
          console.error('[useNotificationBell] Error fetching CSRF token:', err);
        }
      }
    };
    fetchCsrfToken();
  }, [user, csrfToken]);

  // Fetch notifications function
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications/get');
      if (!response.ok) {
        console.error(`[useNotificationBell] HTTP error:`, response.status, response.statusText);
        setError(`ไม่สามารถดึงข้อมูลการแจ้งเตือนได้ (Error: ${response.status})`);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error('[useNotificationBell] API returned error:', data.error);
        setError(data.error || 'ไม่สามารถดึงข้อมูลการแจ้งเตือนได้');
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[useNotificationBell] Fetch notifications error:", err);
      setError(err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!csrfToken) {
      console.error('[useNotificationBell] CSRF Token not available for markAsRead.');
      return;
    }
    
    try {
      const response = await fetch('/api/notifications/markAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ notificationId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state optimistically
          setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else if (response.status === 403) {
        setError('เกิดข้อผิดพลาดด้านความปลอดภัย โปรดรีเฟรชหน้าเว็บ');
        console.error('CSRF token validation failed when marking as read.');
      } else {
        setError('ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้');
        console.error('Failed to mark notification as read:', response.statusText);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      console.error('Error marking notification as read:', err);
    }
  }, [csrfToken]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!csrfToken || unreadCount === 0) {
      console.error('[useNotificationBell] CSRF Token not available or no unread messages.');
      return;
    }
    
    setError(null);
    try {
      const response = await fetch('/api/notifications/markAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ all: true }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
        }
      } else if (response.status === 403) {
        setError('เกิดข้อผิดพลาดด้านความปลอดภัย โปรดรีเฟรชหน้าเว็บ');
        console.error('CSRF token validation failed when marking all as read.');
      } else {
        setError('ไม่สามารถทำเครื่องหมายทั้งหมดว่าอ่านแล้วได้');
        console.error('Failed to mark all notifications as read:', response.statusText);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      console.error('Error marking all notifications as read:', err);
    }
  }, [csrfToken, unreadCount]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch when dropdown opens and poll while open
  useEffect(() => {
    if (!user || !isOpen) return;
    
    // Fetch immediately on open
    fetchNotifications();
    // Poll every 3 minutes while open
    const intervalId = setInterval(fetchNotifications, 180000);
    return () => clearInterval(intervalId);
  }, [user, isOpen, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    csrfToken,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearError
  };
}; 