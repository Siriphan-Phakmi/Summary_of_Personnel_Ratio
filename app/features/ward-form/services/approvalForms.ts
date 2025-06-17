import { db } from '@/app/lib/firebase/firebase';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { format } from 'date-fns';
import { User } from '@/app/features/auth/types/user';
import { WardForm, FormStatus } from '@/app/features/ward-form/types/ward';
import { ApprovalEvent } from '@/app/features/ward-form/types/approval';
import { COLLECTION_NAME } from './constants';
import notificationService, { NotificationType } from '@/app/features/notifications/services/NotificationService';

// อนุมัติแบบฟอร์ม
export const approveWardForm = async (
  formId: string,
  approver: User
): Promise<WardForm | null> => {
  try {
    // ตรวจสอบแบบฟอร์ม
    const formRef = doc(db, COLLECTION_NAME, formId);
    const formDoc = await getDoc(formRef);
    
    if (!formDoc.exists()) {
      console.log('[approveWardForm] Form not found:', formId);
      return null;
    }
    
    // ดึงข้อมูลแบบฟอร์ม
    const formData = formDoc.data() as WardForm;
    
    // ข้อมูลการอนุมัติ
    const approvalEvent: ApprovalEvent = {
      action: 'approve',
      timestamp: Timestamp.now(),
      userId: approver.uid,
      userName: `${approver.firstName} ${approver.lastName}`,
      userRole: approver.role
    };
    
    // อัปเดตแบบฟอร์ม
    await updateDoc(formRef, {
      status: FormStatus.APPROVED,
      approvedBy: approver.uid,
      approvedAt: Timestamp.now(),
      approverRole: approver.role,
      approverFirstName: approver.firstName || '',
      approverLastName: approver.lastName || '',
      approvalHistory: arrayUnion(approvalEvent)
    });
    
    console.log('[approveWardForm] Updated form status to APPROVED');
    
    // ตรวจสอบและสร้าง/อัปเดตข้อมูลสรุปประจำวัน
    let formDate: Date | null = null;
    
    // แปลง TimestampField เป็น Date ให้ถูกต้อง
    if (formData.date) {
      if (typeof formData.date === 'string') {
        // กรณีที่เป็น string (ISO format)
        formDate = new Date(formData.date);
      } else if (formData.date instanceof Date) {
        // กรณีที่เป็น Date object
        formDate = formData.date;
      } else if (typeof (formData.date as any).toDate === 'function') {
        // กรณีที่เป็น Firestore Timestamp
        formDate = (formData.date as any).toDate();
      } else if (formData.date && 'seconds' in formData.date && 'nanoseconds' in formData.date) {
        // กรณีที่เป็น Timestamp object แต่ไม่มี toDate()
        const tsData = formData.date as { seconds: number; nanoseconds: number };
        formDate = new Date(tsData.seconds * 1000);
      } else if (formData.date && '_seconds' in (formData.date as any) && '_nanoseconds' in (formData.date as any)) {
        // กรณีที่เป็น serialized Timestamp
        const tsData = formData.date as { _seconds: number; _nanoseconds: number };
        formDate = new Date(tsData._seconds * 1000);
      }
    }
    
    if (formDate) {
      console.log('[approveWardForm] Form date:', formDate);
      
      // ส่งการแจ้งเตือนถึงผู้ส่งแบบฟอร์ม
      if (formData.createdBy) {
        try {
          const formattedDate = format(formDate, 'dd/MM/yyyy');
          const shiftText = formData.shift === 'morning' ? 'เช้า' : 'ดึก';
          const actionLink = `/ward-form?date=${format(formDate, 'yyyy-MM-dd')}&ward=${formData.wardId}&shift=${formData.shift}`;
          
          await notificationService.createNotification({
            title: 'แบบฟอร์มได้รับการอนุมัติ',
            message: `แบบฟอร์มวันที่ ${formattedDate} กะ ${shiftText} ได้รับการอนุมัติแล้ว`,
            recipientIds: [formData.createdBy],
            type: NotificationType.FORM_APPROVED,
            relatedDocId: formId,
            createdBy: approver.uid,
            actionUrl: actionLink
          });
          console.log('[approveWardForm] Sent approval notification to creator');
        } catch (notifyError) {
          console.error('[approveWardForm] Error sending notification:', notifyError);
        }
      }
    } else {
      console.error('[approveWardForm] Form date is null or invalid format:', formData.date);
    }
    
    // ดึงข้อมูลแบบฟอร์มล่าสุดหลังอัปเดต
    const updatedFormDoc = await getDoc(formRef);
    return {
      ...(updatedFormDoc.data() as WardForm),
      id: updatedFormDoc.id
    };
  } catch (error) {
    console.error('[approveWardForm] Error:', error);
    throw error;
  }
};
