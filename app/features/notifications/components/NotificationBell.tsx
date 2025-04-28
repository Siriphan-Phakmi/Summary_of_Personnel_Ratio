'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheckCircle, FiAlertTriangle, FiFileText, FiClock, FiInfo } from 'react-icons/fi';
import { Notification, NotificationType } from '@/app/core/services/NotificationService';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Button } from '@/app/core/ui';
import { useAuth } from '@/app/features/auth'; // เปลี่ยนจาก AuthContext เป็น auth โดยตรง
import { Timestamp } from 'firebase/firestore';

const NotificationBell: React.FC = () => {
  const { user } = useAuth(); // Removed csrfToken from here
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [csrfTokenState, setCsrfTokenState] = useState<string | null>(null); // <-- State for CSRF token

  // Fetch CSRF Token on mount if user is logged in
  useEffect(() => {
    const fetchCsrf = async () => {
      if (user && !csrfTokenState) {
        try {
          const res = await fetch('/api/auth/csrf');
          if (res.ok) {
            const data = await res.json();
            setCsrfTokenState(data.csrfToken);
            console.log('[NotificationBell] CSRF Token fetched.');
          } else {
             console.error('[NotificationBell] Failed to fetch CSRF token:', res.statusText);
          }
        } catch (err) {
          console.error('[NotificationBell] Error fetching CSRF token:', err);
        }
      }
    };
    fetchCsrf();
  }, [user, csrfTokenState]); // Depend on user and if token already exists


  const fetchNotifications = async () => {
    if (!user || isLoading) return; // Don't fetch if no user or already loading
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/notifications/get'); // Default: get all (including read)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications(); // Initial fetch
      // เพิ่มเวลา poll จาก 60 วินาทีเป็น 3 นาที (180,000 ms) เพื่อลด network requests
      const intervalId = setInterval(fetchNotifications, 180000); 
      return () => clearInterval(intervalId); // Cleanup on unmount
    } else {
      // Clear notifications if user logs out
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
    }
  }, [user]); // Refetch when user changes

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!csrfTokenState) { // <-- Check state instead of context
       console.error('[NotificationBell] CSRF Token not available for markAsRead.');
       return;
    }
    try {
      const response = await fetch('/api/notifications/markAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfTokenState, // <-- Use token from state
        },
        body: JSON.stringify({ notificationId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state immediately for better UX
          setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else if (response.status === 403) {
         setError('เกิดข้อผิดพลาดด้านความปลอดภัย โปรดรีเฟรชหน้าเว็บ'); // Set specific error for CSRF
         console.error('CSRF token validation failed when marking as read.');
      } else {
         setError('ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้'); // Generic error for other failures
         console.error('Failed to mark notification as read:', response.statusText);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ'); // Network or other errors
      console.error('Error marking notification as read:', err);
    }
  };
  
  const handleMarkAllAsRead = async () => {
      if (!csrfTokenState || unreadCount === 0) { // <-- Check state
         console.error('[NotificationBell] CSRF Token not available or no unread messages for markAllAsRead.');
         return;
      }
      setError(null); // Clear previous errors before new attempt
      try {
          const response = await fetch('/api/notifications/markAsRead', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': csrfTokenState, // <-- Use token from state
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
              setError('เกิดข้อผิดพลาดด้านความปลอดภัย โปรดรีเฟรชหน้าเว็บ'); // Set specific error for CSRF
              console.error('CSRF token validation failed when marking all as read.');
          } else {
              setError('ไม่สามารถทำเครื่องหมายทั้งหมดว่าอ่านแล้วได้'); // Generic error
              console.error('Failed to mark all notifications as read:', response.statusText);
          }
      } catch (err) {
          setError('เกิดข้อผิดพลาดในการเชื่อมต่อ'); // Network or other errors
          console.error('Error marking all notifications as read:', err);
      }
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // กำหนดไอคอนตามประเภทการแจ้งเตือน
  const getNotificationIcon = (type: string) => {
      switch (type) {
          case NotificationType.APPROVAL_REQUIRED:
              return <FiFileText className="w-4 h-4 mr-2 text-orange-500" />;
          case NotificationType.FORM_APPROVED:
              return <FiCheckCircle className="w-4 h-4 mr-2 text-green-500" />;
          case NotificationType.FORM_REJECTED:
              return <FiAlertTriangle className="w-4 h-4 mr-2 text-red-500" />;
          case NotificationType.SUMMARY_REQUIRED:
              return <FiClock className="w-4 h-4 mr-2 text-blue-500" />;
          case NotificationType.SYSTEM:
          default:
              return <FiInfo className="w-4 h-4 mr-2 text-gray-500" />;
      }
  };

  // แก้ไข type ให้ชัดเจนกว่าเดิม
  const formatTimestamp = (timestamp: Timestamp | null | Date | number | string): string => {
      try {
          let date: Date;
          
          if (!timestamp) {
              date = new Date();
          } else if (timestamp instanceof Date) {
              date = timestamp;
          } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
              date = new Date(timestamp);
          } else if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
              // Firebase Timestamp
              date = timestamp.toDate();
          } else {
              date = new Date();
              console.warn('Invalid timestamp format:', timestamp);
          }
          
          return formatDistanceToNow(date, { addSuffix: true, locale: th });
      } catch (e) {
          console.error("Error formatting timestamp:", e, timestamp);
          return 'ไม่ทราบเวลา';
      }
  };


  if (!user) return null; // Don't render if not logged in

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        aria-label="การแจ้งเตือน"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">การแจ้งเตือน</h3>
            {unreadCount > 0 && (
                <Button 
                    variant="link" 
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={isLoading}
                    className="text-sm"
                >
                    อ่านทั้งหมด
                </Button>
            )}
          </div>
          {isLoading && <div className="p-4 text-center text-gray-500">กำลังโหลด...</div>}
          {error && <div className="p-4 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>}
          {!isLoading && !error && notifications.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">ไม่มีการแจ้งเตือน</div>
          )}
          {!isLoading && !error && notifications.length > 0 && (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <a
                    href={notification.actionUrl || '#'}
                    target={notification.actionUrl?.startsWith('http') ? '_blank' : '_self'} 
                    rel={notification.actionUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    onClick={(e) => {
                       if (!notification.isRead) {
                           handleMarkAsRead(notification.id!); // Mark as read when clicked
                       }
                       // Allow default navigation if actionUrl exists
                       if (!notification.actionUrl) e.preventDefault(); 
                    }}
                    className="block text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center mb-1">
                         {getNotificationIcon(notification.type)}
                         <span className={`font-semibold ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{notification.title}</span>
                      </div>
                      {!notification.isRead && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleMarkAsRead(notification.id!); // Also allow marking as read via this button
                          }}
                          className="text-xs text-blue-500 hover:underline ml-2 whitespace-nowrap"
                          aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                        >
                          อ่านแล้ว
                        </button>
                      )}
                    </div>
                    <p className={`text-gray-600 dark:text-gray-400 mb-1 ${!notification.isRead ? 'font-normal' : 'font-light'}`}> 
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 