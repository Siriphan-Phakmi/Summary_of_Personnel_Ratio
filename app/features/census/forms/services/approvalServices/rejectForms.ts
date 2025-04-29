import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, FormStatus, FormApproval } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { ApprovalHistoryRecord } from '@/app/core/types/approval';
import { COLLECTION_WARDFORMS, COLLECTION_APPROVALS, COLLECTION_HISTORY } from './index';
import { createServerTimestamp } from '@/app/core/utils/dateUtils';
import { format } from 'date-fns';

/**
 * ปฏิเสธแบบฟอร์ม
 * @param formId รหัสแบบฟอร์ม
 * @param approver ข้อมูลผู้อนุมัติ
 * @param rejectionReason เหตุผลในการปฏิเสธ
 * @returns รหัสของการปฏิเสธ
 */
export const rejectForm = async (
  formId: string,
  approver: User,
  rejectionReason: string
): Promise<string> => {
  try {
    // ดึงข้อมูลแบบฟอร์ม
    const formRef = doc(db, COLLECTION_WARDFORMS, formId);
    const formSnapshot = await getDoc(formRef);
    
    if (!formSnapshot.exists()) {
      throw new Error('ไม่พบข้อมูลแบบฟอร์ม');
    }
    
    const formData = formSnapshot.data() as WardForm;
    
    // ตรวจสอบว่าแบบฟอร์มพร้อมให้อนุมัติหรือไม่
    if (formData.status !== FormStatus.FINAL) {
      throw new Error('ไม่สามารถปฏิเสธแบบฟอร์มได้ เนื่องจากแบบฟอร์มยังไม่พร้อมให้อนุมัติ');
    }
    
    const now = new Date();
    const serverTime = serverTimestamp();

    // ปรับปรุงสถานะของแบบฟอร์มเป็น REJECTED
    await updateDoc(formRef, {
      status: FormStatus.REJECTED,
      updatedAt: serverTime,
      rejectedAt: serverTime,
      rejectedBy: approver.uid,
      rejectionReason: rejectionReason
    });
    
    // บันทึกประวัติการดำเนินการ (Approval History)
    let formDateForHistory: Timestamp;
    if (formData.date instanceof Timestamp) {
        formDateForHistory = formData.date;
    } else if (formData.date instanceof Date) {
        formDateForHistory = Timestamp.fromDate(formData.date);
    } else if (typeof formData.date === 'string') {
        try {
            formDateForHistory = Timestamp.fromDate(new Date(formData.date + 'T00:00:00Z'));
        } catch (e) {
             console.error('Error parsing date string for history record:', formData.date, e);
             formDateForHistory = Timestamp.now();
        }
    } else {
        console.warn('Invalid date type for history record, using current time as fallback.');
        formDateForHistory = Timestamp.now();
    }

    // Generate custom history ID
    const dateStr = format(now, 'yyMMdd');
    const timeStr = format(now, 'HHmm');
    const actorRole = approver.role || 'unknown';
    const customHistoryId = `${actorRole}_${formId}_d${dateStr}_t${timeStr}`;

    const historyRecord: ApprovalHistoryRecord = {
        formId,
        wardId: formData.wardId,
        wardName: formData.wardName,
        date: formDateForHistory,
        shift: formData.shift,
        action: 'REJECTED',
        actorUid: approver.uid,
        actorName: `${approver.firstName || ''} ${approver.lastName || ''}`.trim(),
        timestamp: Timestamp.fromDate(now),
        reason: rejectionReason,
    };
    await setDoc(doc(db, COLLECTION_HISTORY, customHistoryId), historyRecord);
    
    return formId;
  } catch (error) {
    console.error('Error rejecting form:', error);
    throw error;
  }
}; 