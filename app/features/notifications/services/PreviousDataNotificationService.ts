'use client';

import notificationService from './NotificationService';
import { NotificationType } from '../types';
import { Logger } from '@/app/lib/utils/logger';

interface PreviousDataNotificationData {
  userId: string;
  wardName: string;
  selectedDate: string;
  hasPreviousData: boolean;
}

export const PreviousDataNotificationService = {
  /**
   * ส่งการแจ้งเตือนเกี่ยวกับข้อมูลกะดึกย้อนหลัง
   */
  async sendPreviousDataNotification({
    userId,
    wardName,
    selectedDate,
    hasPreviousData,
  }: PreviousDataNotificationData): Promise<string | null> {
    const context = 'PreviousDataNotificationService';

    try {
      const previousDateStr = new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000)
        .toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

      const title = hasPreviousData 
        ? 'พบข้อมูลกะดึกย้อนหลัง'
        : 'ไม่พบข้อมูลกะดึกย้อนหลัง';

      const message = hasPreviousData
        ? `มีข้อมูลกะดึกของวันที่ ${previousDateStr} ของ${wardName} จำนวนผู้ป่วยคงเหลือจะถูกนำมาคำนวณอัตโนมัติ`
        : `ไม่มีข้อมูลกะดึกของวันที่ ${previousDateStr} ของ${wardName} จำนวนผู้ป่วยคงเหลือจะต้องกรอกเอง หรือเริ่มต้นจากศูนย์`;

      Logger.info(`[${context}] Sending previous data notification to user: ${userId}`);

      const notificationId = await notificationService.createNotification({
        title,
        message,
        type: NotificationType.PREVIOUS_DATA_CHECK,
        recipientIds: [userId],
        createdBy: 'system',
        actionUrl: '/census/form', // URL ของหน้าฟอร์ม
      });

      Logger.info(`[${context}] Successfully sent notification with ID: ${notificationId}`);
      return notificationId;

    } catch (error) {
      Logger.error(`[${context}] Failed to send previous data notification:`, error);
      return null;
    }
  },

  /**
   * ตรวจสอบว่าต้องส่งการแจ้งเตือนหรือไม่
   * เพื่อป้องกันการส่งซ้ำ
   */
  shouldSendNotification(
    userId: string,
    wardName: string,
    selectedDate: string
  ): boolean {
    const storageKey = `previousDataNotif_${userId}_${wardName}_${selectedDate}`;
    const lastSent = localStorage.getItem(storageKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 ชั่วโมง

    // หากยังไม่เคยส่งหรือผ่านมาแล้ว 1 ชั่วโมง ให้ส่งได้
    if (!lastSent || (now - parseInt(lastSent)) > oneHour) {
      localStorage.setItem(storageKey, now.toString());
      return true;
    }

    return false;
  },
};

export default PreviousDataNotificationService;
