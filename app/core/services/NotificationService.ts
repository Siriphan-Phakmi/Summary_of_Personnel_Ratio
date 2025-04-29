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

class NotificationService {
  private db = getFirestore();
  private notificationsRef = collection(this.db, 'notifications');

  /**
   * สร้างการแจ้งเตือนใหม่
   * @param notification ข้อมูลการแจ้งเตือน
   * @returns ID ของการแจ้งเตือนที่สร้าง
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    try {
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
    return this.createNotification({
      title: 'รอการอนุมัติ',
      message: `มีแบบฟอร์มใหม่จากวอร์ด ${wardName} รอการอนุมัติ`,
      recipientIds: approverIds,
      type: NotificationType.APPROVAL_REQUIRED,
      relatedDocId: formId,
      createdBy,
      actionUrl: `/census/approval?formId=${formId}`
    });
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
    return this.createNotification({
      title: 'แบบฟอร์มได้รับการอนุมัติ',
      message: `แบบฟอร์มของวอร์ด ${wardName} ได้รับการอนุมัติแล้ว`,
      recipientIds,
      type: NotificationType.FORM_APPROVED,
      relatedDocId: formId,
      createdBy: approvedBy,
      actionUrl: `/census/form?formId=${formId}`
    });
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
    return this.createNotification({
      title: 'แบบฟอร์มถูกปฏิเสธ',
      message: `แบบฟอร์มของวอร์ด ${wardName} ถูกปฏิเสธ: ${reason}`,
      recipientIds,
      type: NotificationType.FORM_REJECTED,
      relatedDocId: formId,
      createdBy: rejectedBy,
      actionUrl: `/census/form?formId=${formId}`
    });
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
    
    return this.createNotification({
      title: 'สรุปรายวันยังไม่เสร็จสมบูรณ์',
      message: `กรุณาตรวจสอบและทำสรุปรายวันสำหรับวอร์ด ${wardName} วันที่ ${dateStr}`,
      recipientIds,
      type: NotificationType.SUMMARY_REQUIRED,
      relatedDocId: `${wardId}_${dateStr}`,
      createdBy,
      actionUrl: `/census/summary?wardId=${wardId}&date=${dateStr}`
    });
  }

  /**
   * ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @returns รายการการแจ้งเตือน
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(this.notificationsRef, where('recipientIds', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as Omit<Notification, 'id'>;
        if (!data) {
          console.warn(`Notification document ${doc.id} has undefined data.`);
          return null;
        }
        return {
          id: doc.id,
          ...data
        };
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
      const q = query(
        this.notificationsRef, 
        where('recipientIds', 'array-contains', userId),
        where('isRead', '==', false)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as Omit<Notification, 'id'>;
        if (!data) {
          console.warn(`Unread notification document ${doc.id} has undefined data.`);
          return null;
        }
        return {
          id: doc.id,
          ...data
        };
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
      const notificationRef = doc(this.db, 'notifications', notificationId);
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
      let successCount = 0;
      
      // ทำการอัปเดททีละรายการ
      for (const id of notificationIds) {
        try {
          const notificationRef = doc(this.db, 'notifications', id);
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
      // ดึงการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ใช้
      const unreadNotifications = await this.getUnreadNotifications(userId);
      const notificationIds = unreadNotifications.map(notification => notification.id!);
      
      return await this.markMultipleAsRead(notificationIds);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }
}

const notificationService = new NotificationService();
export default notificationService; 