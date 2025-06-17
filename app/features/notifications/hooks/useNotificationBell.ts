import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/features/auth';

// Define Notification interface locally since the original import can't be found
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: any; // Timestamp or equivalent
  actionUrl?: string;
}

// Simple logger implementation to replace missing Logger
const Logger = {
  error: (message: string, error?: any) => {
    console.error(`[NotificationBell] ${message}`, error);
  }
};

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
  
  // ป้องกันการเรียก API ซ้ำๆ
  const isFetchingCsrf = useRef<boolean>(false);
  const lastFetchTime = useRef<number>(0);
  const fetchingNotifications = useRef<boolean>(false);

  // Get CSRF Token from sessionStorage first, then fetch if needed
  useEffect(() => {
    const initCsrfToken = async () => {
      // ถ้าไม่มีผู้ใช้หรือมี token อยู่แล้ว หรือกำลังเรียก API อยู่ ให้ออกจากฟังก์ชัน
      if (!user || csrfToken || isFetchingCsrf.current) return;
      
      // ตรวจสอบเวลาที่เรียกครั้งล่าสุด ถ้าน้อยกว่า 5 วินาที ให้ออกจากฟังก์ชัน
      const now = Date.now();
      if (now - lastFetchTime.current < 5000) return;
      
        // Try to get from sessionStorage first
        const existingToken = sessionStorage.getItem('csrfToken');
        if (existingToken) {
          setCsrfToken(existingToken);
          return;
        }
        
      // ตั้งค่าตัวแปรป้องกันการเรียกซ้ำ
      isFetchingCsrf.current = true;
      lastFetchTime.current = now;
      
      try {
        // If not exists, fetch new one
        const response = await fetch('/api/auth/csrf');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
            setCsrfToken(data.csrfToken);
            sessionStorage.setItem('csrfToken', data.csrfToken);
      } catch (err) {
        Logger.error('Failed to fetch CSRF token', err);
      } finally {
        isFetchingCsrf.current = false;
      }
    };
    
    initCsrfToken();
  }, [user, csrfToken]);

  // Fetch notifications function with improved error handling
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    // ป้องกันการเรียกซ้ำถ้ากำลังโหลดอยู่
    if (isLoading || fetchingNotifications.current) return;
    
    fetchingNotifications.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications/get');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ไม่สามารถดึงข้อมูลการแจ้งเตือนได้`);
      }
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        throw new Error(data.error || 'ไม่สามารถดึงข้อมูลการแจ้งเตือนได้');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์';
      setError(errorMessage);
      setNotifications([]);
      setUnreadCount(0);
      Logger.error('Fetch notifications failed', err);
    } finally {
      setIsLoading(false);
      fetchingNotifications.current = false;
    }
  }, [user, isLoading]);

  // Unified mark as read function
  const markAsReadRequest = useCallback(async (payload: { notificationId?: string; all?: boolean }) => {
    if (!csrfToken) {
      Logger.error('CSRF Token not available');
      return false;
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
      } else if (response.status === 403) {
        setError('เกิดข้อผิดพลาดด้านความปลอดภัย โปรดรีเฟรชหน้าเว็บ');
        return false;
      } else {
        setError('ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้');
        return false;
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      Logger.error('Mark as read request failed', err);
      return false;
    }
  }, [csrfToken]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsReadRequest({ notificationId });
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [markAsReadRequest]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    
    setError(null);
    const success = await markAsReadRequest({ all: true });
    if (success) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
        }
  }, [markAsReadRequest, unreadCount]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch when dropdown opens and poll while open
  useEffect(() => {
    if (!user || !isOpen) return;
    
    // เรียกครั้งแรกเมื่อเปิด dropdown
    fetchNotifications();
    
    // ตั้งเวลาเรียกทุก 3 นาที แทนที่จะเรียกถี่เกินไป
    const intervalId = setInterval(fetchNotifications, 180000); // 3 minutes
    
    // ล้าง interval เมื่อปิด dropdown
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