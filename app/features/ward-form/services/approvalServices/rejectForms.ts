import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { FormStatus, WardForm } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { ApprovalHistoryRecord } from '@/app/features/ward-form/types/approval';
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_APPROVALS, 
  COLLECTION_HISTORY 
} from '../constants';
import { format } from 'date-fns';

/**
 * ปฏิเสธแบบฟอร์ม
 * @param formId รหัสแบบฟอร์ม
 * @param rejectionReason เหตุผลในการปฏิเสธ
 * @param actor ข้อมูลผู้อนุมัติ
 * @returns {Promise<void>}
 */
export const rejectForm = async (
  formId: string,
  rejectionReason: string,
  actor: User
): Promise<void> => {
  if (!formId || !rejectionReason || !actor) {
    throw new Error("Missing required parameters for rejecting a form.");
  }

  const formRef = doc(db, COLLECTION_WARDFORMS, formId);

  // การสร้างประวัติการปฏิเสธ (History Record)
  // หมายเหตุ: เราต้องการ form data บางส่วนเพื่อสร้าง history ที่สมบูรณ์
  // แต่เนื่องจาก logic นี้ไม่ได้ fetch form ก่อน เราจะใช้ข้อมูลเท่าที่มี
  const now = new Date();
  const dateStr = format(now, 'yyMMdd');
  const timeStr = format(now, 'HHmm');
  const actorRole = actor.role || 'unknown';
  const customHistoryId = `${actorRole}_${formId}_d${dateStr}_t${timeStr}`;

  const historyRecord: Omit<ApprovalHistoryRecord, 'wardId' | 'wardName' | 'date' | 'shift'> & { formId: string } = {
    formId,
    action: 'REJECTED',
    actorUid: actor.uid,
    actorName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
    timestamp: Timestamp.fromDate(now),
    reason: rejectionReason,
  };

  const historyRef = doc(db, COLLECTION_HISTORY, customHistoryId);
  
  await updateDoc(formRef, {
    status: FormStatus.REJECTED,
    rejectionReason: rejectionReason,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  });

  // สร้างเอกสารประวัติ
  await setDoc(historyRef, historyRecord, { merge: true });
}; 