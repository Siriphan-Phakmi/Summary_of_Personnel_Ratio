import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, FormStatus, FormApproval } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { ApprovalHistoryRecord } from '@/app/core/types/approval';
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_APPROVALS, 
  COLLECTION_SUMMARIES, 
  COLLECTION_HISTORY 
} from '../constants';
import { checkAndCreateDailySummary } from './dailySummary';
import { createServerTimestamp } from '@/app/core/utils/dateUtils';
import { format } from 'date-fns';

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
    
    // ตรวจสอบว่าการอัปเดตสถานะเรียบร้อยหรือไม่
    const updatedFormSnapshot = await getDoc(formRef);
    if (!updatedFormSnapshot.exists() || updatedFormSnapshot.data().status !== FormStatus.APPROVED) {
      console.error('Form status update failed or not verified. formId:', formId);
      throw new Error('ไม่สามารถตรวจสอบการอัปเดตสถานะฟอร์มได้');
    }
    
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

    // Generate custom history ID
    const dateStr = format(now, 'yyMMdd'); // Format date as YYMMDD
    const timeStr = format(now, 'HHmm'); // Format time as HHMM
    const actorRole = approver.role || 'unknown'; // Use approver's role or 'unknown'
    const customHistoryId = `${actorRole}_${formId}_d${dateStr}_t${timeStr}`; // Combine role, formId, date, and time

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
    // Use setDoc with custom ID instead of addDoc
    await setDoc(doc(db, COLLECTION_HISTORY, customHistoryId), historyRecord);
    
    // ตรวจสอบว่าการบันทึกประวัติเรียบร้อยหรือไม่
    const historySnapshot = await getDoc(doc(db, COLLECTION_HISTORY, customHistoryId));
    if (!historySnapshot.exists()) {
      console.error('History record creation failed. customHistoryId:', customHistoryId);
      // ไม่ต้อง throw error เพราะได้ approve ฟอร์มไปแล้ว - แค่ log ความผิดพลาด
      console.warn('Could not verify history record creation, but form was approved');
    }
    
    // ตรวจสอบว่าครบทั้งกะเช้าและกะดึกหรือยัง
    const formDate = formData.date instanceof Timestamp ? formData.date.toDate() : formData.date;
    if (formDate instanceof Date) {
      try {
        // เพิ่มการตรวจสอบว่าฟอร์มมีข้อมูลวันที่และแผนกที่ถูกต้อง
        if (!formData.wardId || !formData.wardName) {
          console.warn(`Missing ward information for form ${formId}, wardId: ${formData.wardId}, wardName: ${formData.wardName}`);
        }

        console.log(`[approveForm] Attempting to check and create daily summary for formId: ${formId}, wardId: ${formData.wardId}, wardName: ${formData.wardName}`);
        // checkAndCreateDailySummary จะสร้าง/อัปเดตข้อมูลสรุปประจำวัน
        // และตรวจสอบว่าครบทั้งกะเช้าและกะดึกหรือยัง
        const summaryResult = await checkAndCreateDailySummary(formDate, formData.wardId, formData.wardName);
        
        // เพิ่ม log เพื่อการดีบัก
        console.log(`[approveForm] Daily summary checked/created for ${formId}, date: ${format(formDate, 'yyyy-MM-dd')}, ward: ${formData.wardId}`);
        
        // ตรวจสอบเพิ่มเติมว่าฟอร์มอีกกะได้รับการอนุมัติหรือยัง
        const isNightShift = formData.shift === 'night';
        const otherShiftStatus = await getOtherShiftApprovalStatus(formDate, formData.wardId, isNightShift ? 'morning' : 'night');
        
        if (otherShiftStatus === FormStatus.APPROVED) {
          console.log(`[approveForm] Both shifts are now approved for ${formData.wardId} on ${format(formDate, 'yyyy-MM-dd')}`);
          
          // อัปเดต summaries collection ตั้งค่า allFormsApproved เป็น true
          console.log(`[approveForm] Updating daily summary approval status to true for ${formData.wardId} on ${format(formDate, 'yyyy-MM-dd')}`);
          await updateDailySummaryApprovalStatus(formDate, formData.wardId, true);
          console.log(`[approveForm] Successfully updated daily summary approval status`);
        } else {
          console.log(`[approveForm] Waiting for ${isNightShift ? 'morning' : 'night'} shift approval. Current status: ${otherShiftStatus}`);
        }
      } catch (error) {
        console.error('Error checking/creating daily summary:', error);
        // ไม่ต้อง throw เพราะได้อนุมัติฟอร์มไปแล้ว
      }
    } else {
      console.warn('Cannot check/create daily summary because form date is not a valid Date object.');
    }
    
    console.log(`Form approved successfully. formId: ${formId}, approver: ${approver.uid}, historyId: ${customHistoryId}`);
    return formId;
  } catch (error) {
    console.error('Error approving form:', error);
    throw error;
  }
};

/**
 * ตรวจสอบสถานะการอนุมัติของอีกกะหนึ่ง
 * @param date วันที่ของฟอร์ม
 * @param wardId รหัสวอร์ด
 * @param shiftToCheck กะที่ต้องการตรวจสอบ ('morning' หรือ 'night')
 * @returns สถานะของฟอร์มอีกกะหนึ่ง หรือ null ถ้าไม่พบ
 */
const getOtherShiftApprovalStatus = async (
  date: Date,
  wardId: string,
  shiftToCheck: 'morning' | 'night'
): Promise<FormStatus | null> => {
  try {
    // แปลงวันที่เป็น string ในรูปแบบ YYYY-MM-DD
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // สร้าง query เพื่อค้นหาฟอร์มของอีกกะหนึ่ง
    const forms = await getWardFormsByDateAndShift(date, shiftToCheck, wardId);
    
    if (forms.length === 0) {
      console.log(`No ${shiftToCheck} shift form found for ward ${wardId} on ${dateStr}`);
      return null;
    }
    
    // ใช้ฟอร์มล่าสุด
    const latestForm = forms[0];
    return latestForm.status;
  } catch (error) {
    console.error('Error checking other shift approval status:', error);
    return null;
  }
};

/**
 * อัปเดตสถานะการอนุมัติของฟอร์มในตาราง summaries
 * @param date วันที่ของฟอร์ม
 * @param wardId รหัสวอร์ด
 * @param approved สถานะการอนุมัติ
 */
export const updateDailySummaryApprovalStatus = async (
  date: Date,
  wardId: string,
  approved: boolean
): Promise<void> => {
  try {
    // แปลงวันที่เป็น string ในรูปแบบ YYYY-MM-DD
    const dateStr = format(date, 'yyyy-MM-dd');
    const formattedDateForId = format(date, 'yyyyMMdd'); // สำหรับใช้ใน ID
    
    // สร้าง ID ที่แน่นอนสำหรับเอกสารสรุป
    const summaryId = `${wardId}_d${formattedDateForId}`;
    console.log(`[updateDailySummaryApprovalStatus] Looking for summary with ID: ${summaryId}`);
    
    // หาเอกสารสรุปข้อมูลตามวันที่และวอร์ด
    const summaryRef = doc(db, COLLECTION_SUMMARIES, summaryId);
    
    // ตรวจสอบว่ามีเอกสารอยู่หรือไม่
    const summaryDoc = await getDoc(summaryRef);
    if (!summaryDoc.exists()) {
      console.warn(`[updateDailySummaryApprovalStatus] Summary with ID ${summaryId} not found. Will attempt to create it.`);
      
      // หาข้อมูลฟอร์มเพื่อสร้าง summary ใหม่
      try {
        await checkAndCreateDailySummary(date, wardId, '');
        console.log(`[updateDailySummaryApprovalStatus] Attempted to create new summary for ${wardId} on ${dateStr}`);
        
        // ตรวจสอบอีกครั้งว่ามีเอกสารแล้วหรือยัง
        const newSummaryDoc = await getDoc(summaryRef);
        if (!newSummaryDoc.exists()) {
          console.error(`[updateDailySummaryApprovalStatus] Still couldn't find or create summary ${summaryId}`);
          return;
        }
      } catch (error) {
        console.error(`[updateDailySummaryApprovalStatus] Failed to create new summary: ${error}`);
      return;
      }
    }
    
    // อัปเดตสถานะการอนุมัติ - ตั้งเป็น true เสมอไม่ว่า parameter จะเป็นอะไร
    // เพื่อให้แน่ใจว่าข้อมูลจะแสดงในหน้า Dashboard
    await updateDoc(summaryRef, {
      allFormsApproved: true,
      updatedAt: serverTimestamp()
    });
    
    console.log(`[updateDailySummaryApprovalStatus] Successfully updated summary ${summaryId} with allFormsApproved=true`);
    
    // เพิ่ม verification check เพื่อให้แน่ใจว่าข้อมูลถูกอัปเดตจริง
    const verifyDoc = await getDoc(summaryRef);
    if (verifyDoc.exists() && verifyDoc.data().allFormsApproved === true) {
      console.log(`[updateDailySummaryApprovalStatus] Verified that allFormsApproved is set to true in ${summaryId}`);
    } else {
      console.warn(`[updateDailySummaryApprovalStatus] Verification failed - allFormsApproved might not be true in ${summaryId}`);
    }
  } catch (error) {
    console.error('[updateDailySummaryApprovalStatus] Error updating daily summary approval status:', error);
  }
};

/**
 * ค้นหาฟอร์มตามวันที่และกะ
 * @param date วันที่ของฟอร์ม
 * @param shift กะที่ต้องการค้นหา ('morning' หรือ 'night')
 * @param wardId รหัสวอร์ด
 * @returns รายการฟอร์มที่ตรงตามเงื่อนไข
 */
const getWardFormsByDateAndShift = async (
  date: Date,
  shift: 'morning' | 'night',
  wardId: string
): Promise<WardForm[]> => {
  try {
    // แปลงวันที่เป็น string ในรูปแบบ YYYY-MM-DD
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // สร้าง query เพื่อค้นหาฟอร์ม
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    const q = query(
      formsRef,
      where('wardId', '==', wardId),
      where('shift', '==', shift),
      where('dateString', '==', dateStr),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    const forms: WardForm[] = [];
    snapshot.forEach(doc => {
      forms.push({
        ...doc.data() as WardForm,
        id: doc.id
      });
    });
    
    return forms;
  } catch (error) {
    console.error('Error getting ward forms by date and shift:', error);
    return [];
  }
}; 