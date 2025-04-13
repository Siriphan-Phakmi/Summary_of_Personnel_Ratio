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
import { checkAndCreateDailySummary } from './dailySummary';
import { createServerTimestamp } from '@/app/core/utils/timestampUtils';

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
    
    // ปรับปรุงสถานะของแบบฟอร์มเป็น APPROVED
    await updateDoc(formRef, {
      status: FormStatus.APPROVED,
      updatedAt: createServerTimestamp()
    });
    
    // สร้างข้อมูลการอนุมัติ
    const approvalData: FormApproval = {
      formId,
      wardId: formData.wardId,
      wardName: formData.wardName,
      date: formData.date,
      shift: formData.shift,
      status: 'approved',
      approvedBy: approver.uid,
      approverFirstName: approver.firstName || '',
      approverLastName: approver.lastName || '',
      approvedAt: createServerTimestamp(),
      editedBeforeApproval: !!modifiedData
    };
    
    // เพิ่มข้อมูลที่แก้ไข (ถ้ามี)
    if (modifiedData) {
      approvalData.modifiedData = modifiedData;
    }
    
    // บันทึกข้อมูลการอนุมัติ
    const approvalRef = await addDoc(collection(db, COLLECTION_APPROVALS), approvalData);
    
    // ตรวจสอบว่าครบทั้งกะเช้าและกะดึกหรือยัง
    await checkAndCreateDailySummary(formData.date, formData.wardId, formData.wardName);
    
    return approvalRef.id;
  } catch (error) {
    console.error('Error approving form:', error);
    throw error;
  }
}; 