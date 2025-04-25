import {
  doc,
  getDoc,
  addDoc,
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
import { checkAndCreateDailySummary } from './dailySummary';
import { createServerTimestamp } from '@/app/core/utils/dateUtils';

/**
 * อนุมัติแบบฟอร์ม
 * @param formId รหัสแบบฟอร์ม
 * @param approver ข้อมูลผู้อนุมัติ
 * @param modifiedData ข้อมูลที่แก้ไขก่อนอนุมัติ (ถ้ามี)
 * @returns รหัสของการอนุมัติ
 */
export const approveForm = async (
  formId: string,
  approver: User,
  modifiedData?: Partial<WardForm>
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
      throw new Error('ไม่สามารถอนุมัติแบบฟอร์มได้ เนื่องจากแบบฟอร์มยังไม่พร้อมให้อนุมัติ');
    }
    
    const now = new Date();
    const serverTime = serverTimestamp();
    
    // ปรับปรุงสถานะของแบบฟอร์มเป็น APPROVED
    await updateDoc(formRef, {
      status: FormStatus.APPROVED,
      updatedAt: serverTime,
      approvedAt: serverTime,
      approvedBy: approver.uid,
    });
    
    // บันทึกประวัติการดำเนินการ (Approval History)
    let formDateForHistory: Timestamp;
    if (formData.date instanceof Timestamp) {
        formDateForHistory = formData.date;
    } else if (formData.date instanceof Date) {
        formDateForHistory = Timestamp.fromDate(formData.date);
    } else if (typeof formData.date === 'string') {
        try {
            formDateForHistory = Timestamp.fromDate(new Date(formData.date + 'T00:00:00Z')); // Assume YYYY-MM-DD and UTC
        } catch (e) {
             console.error('Error parsing date string for history record:', formData.date, e);
             formDateForHistory = Timestamp.now(); // Fallback to current time if parsing fails
        }
    } else {
        console.warn('Invalid date type for history record, using current time as fallback.', typeof formData.date);
        formDateForHistory = Timestamp.now(); // Fallback
    }

    const historyRecord: ApprovalHistoryRecord = {
      formId,
      wardId: formData.wardId,
      wardName: formData.wardName,
        date: formDateForHistory, // Use the converted timestamp
      shift: formData.shift,
        action: 'APPROVED',
        actorUid: approver.uid,
        actorName: `${approver.firstName || ''} ${approver.lastName || ''}`.trim(),
        timestamp: Timestamp.fromDate(now), // Use consistent client-side time for history record if needed, or serverTime
    };
    await addDoc(collection(db, COLLECTION_HISTORY), historyRecord);
    
    // ตรวจสอบว่าครบทั้งกะเช้าและกะดึกหรือยัง
    const formDate = formData.date instanceof Timestamp ? formData.date.toDate() : formData.date;
    if (formDate instanceof Date) {
      await checkAndCreateDailySummary(formDate, formData.wardId, formData.wardName);
    } else {
      console.warn('Cannot check/create daily summary because form date is not a valid Date object.');
    }
    
    return formId;
  } catch (error) {
    console.error('Error approving form:', error);
    throw error;
  }
}; 