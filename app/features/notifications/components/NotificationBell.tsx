'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead
  } = useNotificationBell(isOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoized handlers for better performance
  const handleToggleDropdown = useCallback(() => setIsOpen(prev => !prev), []);

  const handleNotificationClick = useCallback((notification: any) => {
    if (!notification.isRead && notification.id) {
      markAsRead(notification.id);
    }
  }, [markAsRead]);

  const handleMarkAsReadClick = useCallback((e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    markAsRead(notificationId);
  }, [markAsRead]);

  // Memoized notification list for performance
  const notificationList = useMemo(() => (
    notifications.length > 0 ? (
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {notifications.map((notification) => (
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
                    {notification.title}
                  </span>
                </div>
                {!notification.isRead && notification.id && (
                  <button 
                    onClick={(e) => handleMarkAsReadClick(e, notification.id!)}
                    className="text-xs text-blue-500 hover:underline ml-2 whitespace-nowrap"
                    aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                  >
                    อ่านแล้ว
                  </button>
                )}
              </div>
              <p className={getNotificationMessageClassName(notification.isRead)}>
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {formatTimestamp(notification.createdAt)}
              </p>
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">ไม่มีการแจ้งเตือน</div>
    )
  ), [notifications, handleNotificationClick, handleMarkAsReadClick]);

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
            {unreadCount > 0 && (
              <Button 
                variant="link" 
                size="sm"
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-sm"
              >
                อ่านทั้งหมด
              </Button>
            )}
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