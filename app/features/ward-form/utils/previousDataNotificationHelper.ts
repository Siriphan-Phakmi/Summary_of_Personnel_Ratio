'use client';

import notificationService, { NotificationType } from '@/app/features/notifications/services/NotificationService';
import { Logger } from '@/app/lib/utils/logger';
import { getUserState, updateUserState } from '@/app/features/auth/services/userStateService';
import { User } from '@/app/features/auth/types/user';

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
 * ตรวจสอบว่าควรส่ง notification หรือไม่ (ใช้ Firebase แทน sessionStorage)
 * เพื่อหลีกเลี่ยงการส่ง notification ซ้ำๆ
 */
export const shouldCreatePreviousDataNotification = async (
  selectedDate: string,
  wardName: string | undefined,
  user: User | undefined
): Promise<boolean> => {
  if (!selectedDate || !wardName || !user?.uid) {
    return false;
  }

  try {
    // ✅ ใช้ Firebase แทน sessionStorage
    const userState = await getUserState(user);
    if (!userState) return true; // ถ้าไม่มี state ให้ส่ง notification

    // สร้าง key สำหรับตรวจสอบ notification
    const notificationKey = `prevData_${wardName}_${selectedDate}`;
    const lastSent = userState.lastNotificationDate;
    
    // ถ้าเคยส่งในวันเดียวกันแล้ว ไม่ต้องส่งอีก
    const today = new Date().toDateString();
    return lastSent !== today;
    
  } catch (error) {
    Logger.error('[PreviousDataNotification] Error checking notification state:', error);
    return true; // ถ้า error ให้ส่ง notification
  }
};

/**
 * บันทึกว่าได้ส่ง notification แล้ว (ใช้ Firebase แทน sessionStorage)
 */
export const markPreviousDataNotificationSent = async (
  selectedDate: string,
  wardName: string,
  user: User
): Promise<void> => {
  try {
    if (!user?.uid) return;

    // ✅ ใช้ Firebase แทน sessionStorage
    const today = new Date().toDateString();
    await updateUserState(user, 'lastNotificationDate', today);
    
    Logger.info(`[PreviousDataNotification] Marked notification as sent for ${wardName} on ${selectedDate}`);
    
  } catch (error) {
    Logger.error('[PreviousDataNotification] Error marking notification as sent:', error);
  }
};
