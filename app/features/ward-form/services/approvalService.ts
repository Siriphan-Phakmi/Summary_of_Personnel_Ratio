/**
 * @file approvalService.ts
 * @description Service หลักสำหรับการจัดการการอนุมัติข้อมูลและสรุปรายวัน
 */

import { User, UserRole } from '@/app/features/auth/types/user';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { DailySummary } from '@/app/features/ward-form/types/approval';
import { format } from 'date-fns';

// นำเข้าฟังก์ชันจากโมดูลย่อย
import { 
  approveForm, 
  rejectForm, 
  getPendingForms, 
  getPendingFormsByUserPermission,
  getDailySummaries
} from './approvalServices/index';

// อัปเดตการ import ใช้ constants.ts
import { COLLECTION_APPROVALS, COLLECTION_WARDFORMS } from './constants';

/**
 * ดึงรายการแบบฟอร์มที่รอการอนุมัติตามสิทธิ์ผู้ใช้งาน
 * @param user ข้อมูลผู้ใช้
 * @param filters เงื่อนไขในการกรอง (วันที่, แผนก, กะ)
 * @returns รายการแบบฟอร์มที่รอการอนุมัติตามสิทธิ์
 */
export const getApprovalsByUserPermission = async (
  user: User,
  filters: {
    startDate?: Date;
    endDate?: Date;
    wardId?: string;
    shift?: ShiftType;
    status?: FormStatus;
  } = {}
): Promise<WardForm[]> => {
  try {
    // ผู้ใช้ระดับ Admin, Super Admin หรือ Developer สามารถดูข้อมูลทั้งหมดได้
    if (
      user.role === UserRole.ADMIN || 
      user.role === UserRole.DEVELOPER
    ) {
      return await getPendingForms(filters);
    }
    
    // ผู้ใช้ระดับ Approver สามารถดูเฉพาะแผนกที่ได้รับมอบหมาย
    if (user.role === UserRole.APPROVER) {
      return await getPendingFormsByUserPermission(user, 100);
    }
    
    // ผู้ใช้ทั่วไปสามารถดูเฉพาะแบบฟอร์มที่ตนเองส่ง
    const pendingForms = await getPendingForms({
      ...(filters as any),
      // เพิ่มเงื่อนไขให้ดึงเฉพาะแบบฟอร์มที่ผู้ใช้ส่ง
      createdBy: user.uid
    });
    
    return pendingForms;
  } catch (error) {
    console.error('Error getting approvals by user permission:', error);
    throw error;
  }
};

/**
 * อนุมัติแบบฟอร์มและบันทึกผู้อนุมัติ
 * @param formId รหัสแบบฟอร์ม
 * @param approver ข้อมูลผู้อนุมัติ
 * @param modifiedData ข้อมูลที่แก้ไขก่อนอนุมัติ (ถ้ามี)
 * @returns Promise ที่ resolve เมื่อทำเสร็จ
 */
export const approveWardForm = async (
  formId: string,
  approver: User,
  modifiedData?: Partial<WardForm>
): Promise<string> => {
  try {
    // approveForm returns the formId string upon success
    return await approveForm(formId, approver, modifiedData);
  } catch (error) {
    console.error('Error approving ward form:', error);
    throw error;
  }
};

/**
 * ปฏิเสธแบบฟอร์มและบันทึกเหตุผล
 * @param formId รหัสแบบฟอร์ม
 * @param approver ข้อมูลผู้อนุมัติ
 * @param reason เหตุผลในการปฏิเสธ
 * @returns Promise ที่ resolve เมื่อทำเสร็จ
 */
export const rejectWardForm = async (
  formId: string,
  approver: User,
  reason: string
): Promise<void> => {
  try {
    // Corrected to pass the full User object as expected by rejectForm
    await rejectForm(formId, reason, approver);
  } catch (error) {
    console.error('Error rejecting ward form:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปประจำวัน
 * @param filters เงื่อนไขในการกรอง (วันที่, แผนก, และสถานะการอนุมัติ)
 * @returns รายการข้อมูลสรุปประจำวัน
 */
export const getDailySummariesByFilters = async (
  filters: {
    startDate?: Date;
    endDate?: Date;
    wardId?: string;
    approvedOnly?: boolean;
  } = {}
): Promise<DailySummary[]> => {
  try {
    return await getDailySummaries(filters);
  } catch (error) {
    console.error('Error getting daily summaries:', error);
    throw error;
  }
}; 