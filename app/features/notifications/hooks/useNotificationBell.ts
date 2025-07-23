import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/features/auth';
import { UserNotification, NotificationType } from '../types'; // Import from centralized types
import notificationService from '../services/NotificationService'; // Import the service
import { Logger } from '@/app/lib/utils/logger'; // Import centralized logger

// Deduplication cache for API requests
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

// ใช้ UserNotification จาก centralized types แทน

export interface NotificationBellState {
  notifications: UserNotification[];
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
  const lastFetchTime = useRef<number>(0);
  const abortController = useRef<AbortController | null>(null);

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

  // Clean expired cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    requestCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_DURATION) {
        requestCache.delete(key);
      }
    });
  }, []);

  // Fetch notifications function with deduplication
  const fetchNotifications = useCallback(async (force = false) => {
    if (!user) {
      console.log('[DEBUG useNotificationBell] No user, skipping fetch');
      return;
    }
    
    console.log(`[DEBUG useNotificationBell] Starting fetch for user: ${user.uid}, force: ${force}`);
    
    const now = Date.now();
    const cacheKey = `fetch-notifications-${user.uid}`;
    
    // Prevent too frequent requests (debounce)
    if (!force && now - lastFetchTime.current < 2000) {
      console.log('[DEBUG useNotificationBell] Skipping due to debounce');
      return;
    }
    
    // Check cache for pending request
    const cached = requestCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      try {
        return await cached.promise;
      } catch (err) {
        requestCache.delete(cacheKey);
      }
    }
    
    if (fetchingNotifications.current && !force) return;
    
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    
    fetchingNotifications.current = true;
    lastFetchTime.current = now;
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    const fetchPromise = (async () => {
      try {
        console.log('[DEBUG useNotificationBell] Calling notificationService.getUserNotifications()');
        const { notifications, unreadCount } = await notificationService.getUserNotifications();
        console.log(`[DEBUG useNotificationBell] Service returned: ${notifications.length} notifications, ${unreadCount} unread`);
        
        // Only update state if this is the latest request
        if (!abortController.current?.signal.aborted) {
          console.log('[DEBUG useNotificationBell] Updating state with new data');
          setState(s => ({ ...s, notifications, unreadCount, isLoading: false }));
        }
        
        return { notifications, unreadCount };
      } catch (err) {
        if (abortController.current?.signal.aborted) {
          return; // Request was cancelled
        }
        
        const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์';
        setState(s => ({ ...s, error: errorMessage, isLoading: false }));
        Logger.error('useNotificationBell: Fetch notifications failed', err);
        
        // Retry with exponential backoff (only if not aborted)
        if (!abortController.current?.signal.aborted) {
          setTimeout(() => {
            fetchNotifications(true);
          }, 5000);
        }
        
        throw err;
      } finally {
        fetchingNotifications.current = false;
        requestCache.delete(cacheKey);
      }
    })();
    
    // Cache the promise
    requestCache.set(cacheKey, { promise: fetchPromise, timestamp: now });
    cleanCache();
    
    return fetchPromise;
  }, [user, cleanCache]);

  // เพิ่ม: โหลดข้อมูลทันทีเมื่อ user login (ไม่รอให้เปิด dropdown)
  useEffect(() => {
    if (!user) {
      setState({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
      });
      return;
    }
    
    console.log('[DEBUG useNotificationBell] User detected, starting immediate fetch');
    // ใช้ setTimeout เพื่อหลีกเลี่ยง race condition กับ dependency
    const timeoutId = setTimeout(() => {
      fetchNotifications(true); // Force fetch เพื่อให้แน่ใจว่าจะ fetch
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user?.uid]); // ใช้ user.uid แทนเพื่อหลีกเลี่ยง infinite re-render

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
      const is404Error = err instanceof Error && (err.message.includes('404') || err.message.includes('not found'));
      
      if (is404Error) {
        // If 404, remove from local state anyway (notification doesn't exist)
        setState(s => {
          const deletedNotification = s.notifications.find(n => n.id === notificationId);
          const wasUnread = deletedNotification && !deletedNotification.isRead;
          
          return {
            ...s,
            notifications: s.notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
            error: null // Don't show error for 404, just clean up UI
          };
        });
      } else {
        setState(s => ({ ...s, error: 'ไม่สามารถลบการแจ้งเตือนได้' }));
        Logger.error('Delete notification failed:', err);
      }
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
    
    console.log('[DEBUG useNotificationBell] Dropdown opened, fetching notifications');
    fetchNotifications(false); // ไม่ force เพื่อใช้ cache ถ้ามี
    
    // Reduce polling frequency and add force parameter
    const intervalId = setInterval(() => {
      fetchNotifications(false); // Don't force, use cache if available
    }, 180000); // Keep 3-minute interval
    
    return () => {
      clearInterval(intervalId);
      // Cancel ongoing request when dropdown closes
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [user?.uid, isOpen]); // ใช้ user.uid แทน user object
  
  // Background polling for unread count (only when dropdown is closed)
  useEffect(() => {
    if (!user || isOpen) return;
    
    console.log('[DEBUG useNotificationBell] Starting background polling');
    // Background polling every 5 minutes to check for new notifications
    const backgroundIntervalId = setInterval(() => {
      // Only fetch if dropdown is closed to avoid interference
      if (!isOpen) {
        console.log('[DEBUG useNotificationBell] Background polling fetch');
        fetchNotifications(false);
      }
    }, 300000); // 5 minutes
    
    return () => {
      clearInterval(backgroundIntervalId);
    };
  }, [user?.uid, isOpen]); // ใช้ user.uid แทน user object
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      // Clean cache entries for this user
      if (user) {
        requestCache.delete(`fetch-notifications-${user.uid}`);
      }
    };
  }, [user]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    deleteNotificationsByType,
  };
}; 