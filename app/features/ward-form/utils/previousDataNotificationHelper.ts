'use client';

import SessionNotificationService from '@/app/features/notifications/services/SessionNotificationService';
import { Logger } from '@/app/lib/utils/logger';
import { User } from '@/app/features/auth/types/user';

interface CreatePreviousDataNotificationParams {
  user: User;
  wardName: string;
  selectedDate: string;
  hasPreviousData: boolean;
}

/**
 * สร้าง notification สำหรับแจ้งเตือนข้อมูลกะดึกย้อนหลัง
 * ใช้ SessionNotificationService เพื่อป้องกันการส่งซ้ำ
 */
export const createPreviousDataNotification = async ({
  user,
  wardName,
  selectedDate,
  hasPreviousData
}: CreatePreviousDataNotificationParams): Promise<void> => {
  try {
    const sessionNotificationService = SessionNotificationService.getInstance();
    
    await sessionNotificationService.createPreviousDataNotification({
      user,
      wardName,
      selectedDate,
      hasPreviousData
    });
    
    Logger.info(`[PreviousDataNotification] Created notification for user ${user.uid}: ${hasPreviousData ? 'พบข้อมูลกะดึกย้อนหลัง' : 'ไม่พบข้อมูลกะดึกย้อนหลัง'}`);
  } catch (error) {
    Logger.error('[PreviousDataNotification] Failed to create notification:', error);
  }
};

/**
 * ตรวจสอบว่าควรส่ง notification หรือไม่ ใช้ SessionNotificationService
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
    const sessionNotificationService = SessionNotificationService.getInstance();
    const checkResult = await sessionNotificationService.shouldSendPreviousDataNotification(
      user, 
      wardName, 
      selectedDate
    );
    
    Logger.info(`[PreviousDataNotification] Notification check result: ${checkResult.reason}`);
    return checkResult.shouldNotify;
    
  } catch (error) {
    Logger.error('[PreviousDataNotification] Error checking notification state:', error);
    return false; // ถ้า error ไม่ส่ง notification
  }
};

/**
 * บันทึกว่าได้ส่ง notification แล้ว (ใช้ SessionNotificationService)
 */
export const markPreviousDataNotificationSent = async (
  selectedDate: string,
  wardName: string,
  user: User
): Promise<void> => {
  try {
    if (!user?.uid) return;

    const sessionNotificationService = SessionNotificationService.getInstance();
    await sessionNotificationService.markPreviousDataNotificationSent(user, wardName, selectedDate);
    
    Logger.info(`[PreviousDataNotification] Marked notification as sent for ${wardName} on ${selectedDate}`);
    
  } catch (error) {
    Logger.error('[PreviousDataNotification] Error marking notification as sent:', error);
  }
};

/**
 * จัดการกรณีที่ข้อมูลถูกลบ - รีเซ็ต state เพื่อให้สามารถตรวจสอบใหม่ได้
 */
export const handleDataDeletion = async (
  selectedDate: string,
  wardName: string,
  user: User
): Promise<void> => {
  try {
    if (!user?.uid) return;

    const sessionNotificationService = SessionNotificationService.getInstance();
    await sessionNotificationService.handleDataDeletion(user, wardName, selectedDate);
    
    Logger.info(`[PreviousDataNotification] Handled data deletion for ${wardName} on ${selectedDate}`);
    
  } catch (error) {
    Logger.error('[PreviousDataNotification] Error handling data deletion:', error);
  }
};
