'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/app/components/ui/Button';
import { useAuth } from '@/app/features/auth';
import { useNotificationBell } from '../hooks/useNotificationBell';
import { BellIcon, NotificationIcon } from './NotificationIcon';
import {
  formatTimestamp,
  getNotificationItemClassName,
  getNotificationTitleClassName,
  getNotificationMessageClassName,
  getNotificationLinkProps
} from '../utils/notificationUtils';
import { useNotificationContext } from '../contexts/NotificationContext';
import { Logger } from '@/app/lib/utils/logger';

// Security: Input validation
const isValidNotificationId = (id: string | undefined): boolean => {
  return Boolean(id && typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id));
};

// Security: Sanitize display text
const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, '').substring(0, 500);
};

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { isOpen, closeNotifications, toggleNotifications } = useNotificationContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    deleteNotificationsByType
  } = useNotificationBell(isOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeNotifications();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeNotifications]);

  // Memoized handlers for better performance
  const handleToggleDropdown = useCallback(() => toggleNotifications(), [toggleNotifications]);

  const handleNotificationClick = useCallback((notification: any) => {
    try {
      if (!notification?.isRead && isValidNotificationId(notification?.id)) {
        markAsRead(notification.id);
        Logger.info('Notification marked as read', { id: notification.id });
      }
    } catch (error) {
      Logger.error('Error handling notification click:', error);
    }
  }, [markAsRead]);

  const handleMarkAsReadClick = useCallback((e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      if (!isValidNotificationId(notificationId)) {
        Logger.warn('Invalid notification ID for mark as read:', notificationId);
        return;
      }
      markAsRead(notificationId);
      Logger.info('Notification manually marked as read', { id: notificationId });
    } catch (error) {
      Logger.error('Error marking notification as read:', error);
    }
  }, [markAsRead]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      if (!isValidNotificationId(notificationId)) {
        Logger.warn('Invalid notification ID for deletion:', notificationId);
        return;
      }
      
      if (confirm('คุณแน่ใจหรือไม่ที่จะลบการแจ้งเตือนนี้?')) {
        deleteNotification(notificationId);
        Logger.info('Notification deleted', { id: notificationId });
      }
    } catch (error) {
      Logger.error('Error deleting notification:', error);
    }
  }, [deleteNotification]);

  const handleDeleteAllClick = useCallback(() => {
    try {
      if (notifications.length === 0) return;
      
      const notificationCount = Math.min(notifications.length, 999); // Security: Limit display count
      if (confirm(`คุณแน่ใจหรือไม่ที่จะลบการแจ้งเตือนทั้งหมด ${notificationCount} รายการ?`)) {
        deleteAllNotifications();
        Logger.info('All notifications deleted', { count: notificationCount });
      }
    } catch (error) {
      Logger.error('Error deleting all notifications:', error);
    }
  }, [deleteAllNotifications, notifications.length]);

  // Memoized notification list for performance with security enhancements
  const notificationList = useMemo(() => {
    if (notifications.length === 0) {
      return <div className="p-4 text-center text-gray-500 dark:text-gray-400">ไม่มีการแจ้งเตือน</div>;
    }

    // Security: Limit number of notifications displayed to prevent DOM overflow
    const displayNotifications = notifications.slice(0, 50);
    
    return (
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayNotifications.map((notification) => {
          // Security: Validate notification data
          if (!notification?.id || typeof notification.id !== 'string') {
            Logger.warn('Invalid notification data detected:', notification);
            return null;
          }

          return (
            <li key={notification.id} className={getNotificationItemClassName(notification.isRead)}>
              <a
                {...getNotificationLinkProps(notification.actionUrl)}
                onClick={() => handleNotificationClick(notification)}
                className="block text-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center mb-1">
                    <NotificationIcon type={notification.type} />
                    <span className={getNotificationTitleClassName(notification.isRead)}>
                      {sanitizeText(notification.title || '')}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {!notification.isRead && isValidNotificationId(notification.id) && (
                      <button 
                        onClick={(e) => handleMarkAsReadClick(e, notification.id)}
                        className="text-xs text-blue-500 hover:underline whitespace-nowrap"
                        aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                        type="button"
                      >
                        อ่านแล้ว
                      </button>
                    )}
                    {isValidNotificationId(notification.id) && (
                      <button 
                        onClick={(e) => handleDeleteClick(e, notification.id)}
                        className="text-xs text-red-500 hover:underline whitespace-nowrap"
                        aria-label="ลบการแจ้งเตือน"
                        type="button"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
                <p className={getNotificationMessageClassName(notification.isRead)}>
                  {sanitizeText(notification.message || '')}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTimestamp(notification.createdAt)}
                </p>
              </a>
            </li>
          );
        }).filter(Boolean)}
        {notifications.length > 50 && (
          <li className="p-2 text-center text-xs text-gray-500">
            และอีก {notifications.length - 50} รายการ...
          </li>
        )}
      </ul>
    );
  }, [notifications, handleNotificationClick, handleMarkAsReadClick, handleDeleteClick]);

  // Don't render if user not logged in
  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <BellIcon unreadCount={unreadCount} onClick={handleToggleDropdown} />

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">การแจ้งเตือน</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  อ่านทั้งหมด
                </Button>
              )}
              {notifications.length > 0 && (
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={handleDeleteAllClick}
                  disabled={isLoading}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  ลบทั้งหมด
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading && (
            <div className="p-4 text-center text-gray-500">กำลังโหลด...</div>
          )}
          
          {error && (
            <div className="p-4 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>
          )}
          
          {!isLoading && !error && notificationList}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 