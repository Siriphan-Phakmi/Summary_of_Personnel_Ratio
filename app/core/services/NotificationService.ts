import { getFirestore } from 'firebase/firestore';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  serverTimestamp,
  DocumentReference,
  Timestamp
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/app/core/firebase/firebase';

// Types
export interface Notification {
  id?: string;
  title: string; 
  message: string;
  recipientIds: string[]; // user IDs ของผู้รับการแจ้งเตือน
  type: NotificationType;
  relatedDocId?: string; // ID ของเอกสารที่เกี่ยวข้อง (เช่น formId)
  isRead: boolean;
  createdAt: Timestamp | null;
  createdBy: string;
  actionUrl?: string; // URL ที่จะนำทางเมื่อคลิกที่การแจ้งเตือน
}

export enum NotificationType {
  APPROVAL_REQUIRED = 'approval_required',
  FORM_APPROVED = 'form_approved', 
  FORM_REJECTED = 'form_rejected',
  SUMMARY_REQUIRED = 'summary_required',
  SYSTEM = 'system'
}

// รูปแบบพื้นฐานสำหรับการสร้างการแจ้งเตือนต่างๆ
export interface NotificationTemplate {
  type: NotificationType;
  getTitleAndMessage: (params: any) => { title: string; message: string };
  getActionUrl: (params: any) => string;
}

// กำหนด templates สำหรับการแจ้งเตือนแต่ละประเภท
const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.APPROVAL_REQUIRED]: {
    type: NotificationType.APPROVAL_REQUIRED,
    getTitleAndMessage: ({ wardName }) => ({
      title: 'รอการอนุมัติ',
      message: `มีแบบฟอร์มใหม่จากวอร์ด ${wardName} รอการอนุมัติ`
    }),
    getActionUrl: ({ formId }) => `/census/approval?formId=${formId}`
  },
  [NotificationType.FORM_APPROVED]: {
    type: NotificationType.FORM_APPROVED,
    getTitleAndMessage: ({ wardName }) => ({
      title: 'แบบฟอร์มได้รับการอนุมัติ',
      message: `แบบฟอร์มของวอร์ด ${wardName} ได้รับการอนุมัติแล้ว`
    }),
    getActionUrl: ({ formId }) => `/census/form?formId=${formId}`
  },
  [NotificationType.FORM_REJECTED]: {
    type: NotificationType.FORM_REJECTED,
    getTitleAndMessage: ({ wardName, reason }) => ({
      title: 'แบบฟอร์มถูกปฏิเสธ',
      message: `แบบฟอร์มของวอร์ด ${wardName} ถูกปฏิเสธ: ${reason}`
    }),
    getActionUrl: ({ formId }) => `/census/form?formId=${formId}`
  },
  [NotificationType.SUMMARY_REQUIRED]: {
    type: NotificationType.SUMMARY_REQUIRED,
    getTitleAndMessage: ({ wardName, dateStr }) => ({
      title: 'สรุปรายวันยังไม่เสร็จสมบูรณ์',
      message: `กรุณาตรวจสอบและทำสรุปรายวันสำหรับวอร์ด ${wardName} วันที่ ${dateStr}`
    }),
    getActionUrl: ({ wardId, dateStr }) => `/census/summary?wardId=${wardId}&date=${dateStr}`
  },
  [NotificationType.SYSTEM]: {
    type: NotificationType.SYSTEM,
    getTitleAndMessage: ({ title, message }) => ({ title, message }),
    getActionUrl: ({ url }) => url || ''
  }
};

class NotificationService {
  private notificationsRef = collection(db, 'notifications');

  /**
   * สร้างการแจ้งเตือนใหม่
   * @param notification ข้อมูลการแจ้งเตือน
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!notification.title || !notification.message || !notification.type) {
        throw new Error('Missing required notification fields');
      }
      
      // ตรวจสอบรายการผู้รับ
      if (!notification.recipientIds || !Array.isArray(notification.recipientIds) || notification.recipientIds.length === 0) {
        console.warn('Creating notification without recipients');
      }

      // เพิ่มข้อมูลเพิ่มเติมสำหรับการแจ้งเตือน
      const newNotification = {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(this.notificationsRef, newNotification);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * สร้างการแจ้งเตือนตาม template ที่กำหนด
   * @param type ประเภทการแจ้งเตือน
   * @param params พารามิเตอร์สำหรับการสร้างการแจ้งเตือน
   * @param recipientIds รายการ ID ของผู้รับ
   * @param createdBy ID ของผู้สร้างการแจ้งเตือน
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createNotificationFromTemplate(
    type: NotificationType,
    params: any,
    recipientIds: string[],
    createdBy: string
  ): Promise<string> {
    const template = notificationTemplates[type];
    if (!template) {
      throw new Error(`Notification template not found for type: ${type}`);
    }

    const { title, message } = template.getTitleAndMessage(params);
    const actionUrl = template.getActionUrl(params);
    const relatedDocId = params.formId || params.relatedDocId || '';

    return this.createNotification({
      title,
      message,
      recipientIds,
      type,
      relatedDocId,
      createdBy,
      actionUrl
    });
  }

  /**
   * สร้างการแจ้งเตือนสำหรับการขออนุมัติแบบฟอร์ม
   * @param formId ID ของแบบฟอร์ม
   * @param wardId ID ของวอร์ด
   * @param wardName ชื่อวอร์ด
   * @param approverIds รายการ ID ของผู้อนุมัติ
   * @param createdBy ID ของผู้สร้างแบบฟอร์ม
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createApprovalRequiredNotification(
    formId: string,
    wardId: string,
    wardName: string,
    approverIds: string[],
    createdBy: string
  ): Promise<string> {
    return this.createNotificationFromTemplate(
      NotificationType.APPROVAL_REQUIRED,
      { formId, wardId, wardName },
      approverIds,
      createdBy
    );
  }

  /**
   * สร้างการแจ้งเตือนเมื่อแบบฟอร์มได้รับการอนุมัติ
   * @param formId ID ของแบบฟอร์ม
   * @param wardId ID ของวอร์ด
   * @param wardName ชื่อวอร์ด
   * @param recipientIds รายการ ID ของผู้รับการแจ้งเตือน
   * @param approvedBy ID ของผู้อนุมัติ
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createFormApprovedNotification(
    formId: string,
    wardId: string,
    wardName: string,
    recipientIds: string[],
    approvedBy: string
  ): Promise<string> {
    return this.createNotificationFromTemplate(
      NotificationType.FORM_APPROVED,
      { formId, wardId, wardName },
      recipientIds,
      approvedBy
    );
  }

  /**
   * สร้างการแจ้งเตือนเมื่อแบบฟอร์มถูกปฏิเสธ
   * @param formId ID ของแบบฟอร์ม
   * @param wardId ID ของวอร์ด
   * @param wardName ชื่อวอร์ด
   * @param reason เหตุผลของการปฏิเสธ
   * @param recipientIds รายการ ID ของผู้รับการแจ้งเตือน
   * @param rejectedBy ID ของผู้ปฏิเสธ
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createFormRejectedNotification(
    formId: string,
    wardId: string,
    wardName: string,
    reason: string,
    recipientIds: string[],
    rejectedBy: string
  ): Promise<string> {
    return this.createNotificationFromTemplate(
      NotificationType.FORM_REJECTED,
      { formId, wardId, wardName, reason },
      recipientIds,
      rejectedBy
    );
  }

  /**
   * สร้างการแจ้งเตือนเมื่อต้องทำสรุปรายวัน
   * @param wardId ID ของวอร์ด
   * @param wardName ชื่อวอร์ด
   * @param date วันที่ต้องการให้ทำสรุป
   * @param recipientIds รายการ ID ของผู้รับการแจ้งเตือน
   * @param createdBy ID ของผู้สร้างการแจ้งเตือน
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createSummaryRequiredNotification(
    wardId: string,
    wardName: string,
    date: Date,
    recipientIds: string[],
    createdBy: string
  ): Promise<string> {
    const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    return this.createNotificationFromTemplate(
      NotificationType.SUMMARY_REQUIRED,
      { wardId, wardName, dateStr },
      recipientIds,
      createdBy
    );
  }

  /**
   * ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @returns รายการการแจ้งเตือน
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      if (!userId) {
        console.warn('getUserNotifications called with empty userId');
        return [];
      }

      const q = query(this.notificationsRef, where('recipientIds', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        try {
          const data = doc.data();
        if (!data) {
          console.warn(`Notification document ${doc.id} has undefined data.`);
          return null;
        }
          
          // ตรวจสอบว่าข้อมูลมีฟิลด์ที่จำเป็นหรือไม่
          if (!data.title || !data.message || !data.type) {
            console.warn(`Notification document ${doc.id} is missing required fields.`);
            return null;
          }
          
        return {
          id: doc.id,
            title: data.title || '',
            message: data.message || '',
            recipientIds: Array.isArray(data.recipientIds) ? data.recipientIds : [],
            type: data.type || NotificationType.SYSTEM,
            relatedDocId: data.relatedDocId || '',
            isRead: !!data.isRead,
            createdAt: data.createdAt || null,
            createdBy: data.createdBy || '',
            actionUrl: data.actionUrl || ''
          } as Notification;
        } catch (err) {
          console.error(`Error processing notification ${doc.id}:`, err);
          return null;
        }
      }).filter(Boolean) as Notification[];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * ดึงการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @returns รายการการแจ้งเตือนที่ยังไม่ได้อ่าน
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      if (!userId) {
        console.warn('getUnreadNotifications called with empty userId');
        return [];
      }

      const q = query(
        this.notificationsRef, 
        where('recipientIds', 'array-contains', userId),
        where('isRead', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        try {
          const data = doc.data();
        if (!data) {
          console.warn(`Unread notification document ${doc.id} has undefined data.`);
          return null;
        }
          
          // ตรวจสอบว่าข้อมูลมีฟิลด์ที่จำเป็นหรือไม่
          if (!data.title || !data.message || !data.type) {
            console.warn(`Unread notification document ${doc.id} is missing required fields.`);
            return null;
          }
          
        return {
          id: doc.id,
            title: data.title || '',
            message: data.message || '',
            recipientIds: Array.isArray(data.recipientIds) ? data.recipientIds : [],
            type: data.type || NotificationType.SYSTEM,
            relatedDocId: data.relatedDocId || '',
            isRead: false, // เป็น unread แน่นอน
            createdAt: data.createdAt || null,
            createdBy: data.createdBy || '',
            actionUrl: data.actionUrl || ''
          } as Notification;
        } catch (err) {
          console.error(`Error processing unread notification ${doc.id}:`, err);
          return null;
        }
      }).filter(Boolean) as Notification[];
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }

  /**
   * ทำเครื่องหมายว่าการแจ้งเตือนได้ถูกอ่านแล้ว
   * @param notificationId ID ของการแจ้งเตือน
   * @returns สถานะความสำเร็จ
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      if (!notificationId) {
        console.warn('markAsRead called with empty notificationId');
        return false;
      }

      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * ทำเครื่องหมายว่าการแจ้งเตือนหลายรายการได้ถูกอ่านแล้ว
   * @param notificationIds รายการ ID ของการแจ้งเตือน
   * @returns จำนวนรายการที่อัปเดทสำเร็จ
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<number> {
    try {
      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        console.warn('markMultipleAsRead called with empty notificationIds array');
        return 0;
      }

      let successCount = 0;
      
      // ทำการอัปเดททีละรายการ
      for (const id of notificationIds) {
        try {
          const notificationRef = doc(db, 'notifications', id);
          await updateDoc(notificationRef, {
            isRead: true
          });
          successCount++;
        } catch (err) {
          console.error(`Error marking notification ${id} as read:`, err);
        }
      }
      
      return successCount;
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error);
      return 0;
    }
  }
  
  /**
   * ทำเครื่องหมายว่าการแจ้งเตือนทั้งหมดของผู้ใช้ได้ถูกอ่านแล้ว
   * @param userId ID ของผู้ใช้
   * @returns จำนวนรายการที่อัปเดทสำเร็จ
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      if (!userId) {
        console.warn('markAllAsRead called with empty userId');
        return 0;
      }

      // ดึงการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ใช้
      const unreadNotifications = await this.getUnreadNotifications(userId);
      
      if (unreadNotifications.length === 0) {
        return 0;
      }
      
      const notificationIds = unreadNotifications
        .filter(notification => notification.id)
        .map(notification => notification.id!);
      
      return await this.markMultipleAsRead(notificationIds);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }
}

const notificationService = new NotificationService();
export default notificationService; 