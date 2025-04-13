import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, FormStatus, FormApproval } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { COLLECTION_WARDFORMS, COLLECTION_APPROVALS } from './index';
import { createServerTimestamp } from '@/app/core/utils/timestampUtils';

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
    
    // ปรับปรุงสถานะของแบบฟอร์มเป็น REJECTED
    await updateDoc(formRef, {
      status: FormStatus.REJECTED,
      updatedAt: createServerTimestamp()
    });
    
    // สร้างข้อมูลการปฏิเสธ
    const rejectionData: FormApproval = {
      formId,
      wardId: formData.wardId,
      wardName: formData.wardName,
      date: formData.date,
      shift: formData.shift,
      status: 'rejected',
      approvedBy: approver.uid,
      approverFirstName: approver.firstName || '',
      approverLastName: approver.lastName || '',
      approvedAt: createServerTimestamp(),
      rejectionReason
    };
    
    // บันทึกข้อมูลการปฏิเสธ
    const rejectionRef = await addDoc(collection(db, COLLECTION_APPROVALS), rejectionData);
    
    return rejectionRef.id;
  } catch (error) {
    console.error('Error rejecting form:', error);
    throw error;
  }
}; 