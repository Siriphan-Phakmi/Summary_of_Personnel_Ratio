'use client';

import notificationService, { NotificationType } from '@/app/features/notifications/services/NotificationService';
import { Logger } from '@/app/lib/utils/logger';

interface CreatePreviousDataNotificationParams {
  userId: string;
  wardName: string;
  selectedDate: string;
  hasPreviousData: boolean;
}

/**
 * สร้าง notification สำหรับแจ้งเตือนข้อมูลกะดึกย้อนหลัง
 */
export const createPreviousDataNotification = async ({
  userId,
  wardName,
  selectedDate,
  hasPreviousData
}: CreatePreviousDataNotificationParams): Promise<void> => {
  try {
    const previousDate = new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000);
    const previousDateStr = previousDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const notificationData = {
      title: hasPreviousData ? 'พบข้อมูลกะดึกย้อนหลัง' : 'ไม่พบข้อมูลกะดึกย้อนหลัง',
      message: hasPreviousData 
        ? `มีข้อมูลกะดึกของวันที่ ${previousDateStr} ของ${wardName} จำนวนผู้ป่วยคงเหลือจะถูกนำมาคำนวณอัตโนมัติ`
        : `ไม่มีข้อมูลกะดึกของวันที่ ${previousDateStr} ของ${wardName} จำนวนผู้ป่วยคงเหลือจะต้องกรอกเอง หรือเริ่มต้นจากศูนย์`,
      type: hasPreviousData ? NotificationType.INFO : NotificationType.WARNING,
      recipientIds: [userId],
      createdBy: userId, // เพิ่ม createdBy field
      actionUrl: `/census/form` // ใส่ actionUrl แทน undefined เพื่อป้องกัน Firebase Error
    };

    await notificationService.createNotification(notificationData);
    
    Logger.info(`[PreviousDataNotification] Created notification for user ${userId}: ${notificationData.title}`);
  } catch (error) {
    Logger.error('[PreviousDataNotification] Failed to create notification:', error);
    // ไม่ throw error เพราะไม่อยากให้กระทบการทำงานหลัก
  }
};

/**
 * ตรวจสอบว่าควรส่ง notification หรือไม่
 * เพื่อหลีกเลี่ยงการส่ง notification ซ้ำๆ
 */
export const shouldCreatePreviousDataNotification = (
  selectedDate: string,
  wardName: string | undefined,
  userId: string | undefined
): boolean => {
  if (!selectedDate || !wardName || !userId) {
    return false;
  }

  // สร้าง key สำหรับ sessionStorage เพื่อตรวจสอบว่าเคยส่งแล้วหรือยัง
  const notificationKey = `prevData_${userId}_${wardName}_${selectedDate}`;
  const lastSent = sessionStorage.getItem(notificationKey);
  
  // ถ้าเคยส่งในวันเดียวกันแล้ว ไม่ต้องส่งอีก
  const today = new Date().toDateString();
  return lastSent !== today;
};

/**
 * บันทึกว่าได้ส่ง notification แล้ว
 */
export const markPreviousDataNotificationSent = (
  selectedDate: string,
  wardName: string,
  userId: string
): void => {
  const notificationKey = `prevData_${userId}_${wardName}_${selectedDate}`;
  const today = new Date().toDateString();
  sessionStorage.setItem(notificationKey, today);
};
