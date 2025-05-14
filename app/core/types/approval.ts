import { TimestampField } from './user';
import { ShiftType } from './user';
import { Timestamp } from 'firebase/firestore';
import { ShiftType as WardShiftType } from './ward';

/**
 * สถานะการอนุมัติแบบฟอร์ม
 */
export enum ApprovalStatus {
  PENDING = 'pending',    // รอการอนุมัติ
  APPROVED = 'approved',  // อนุมัติแล้ว
  REJECTED = 'rejected'   // ปฏิเสธการอนุมัติ
}

/**
 * บันทึกเหตุการณ์การอนุมัติ (สำหรับเก็บใน approvalHistory array)
 */
export interface ApprovalEvent {
  action: 'approve' | 'reject';
  timestamp: Timestamp;
  userId: string;
  userName: string;
  userRole: string;
  reason?: string;
}

/**
 * บันทึกการอนุมัติแบบฟอร์ม
 */
export interface ApprovalRecord {
  id?: string;             // รหัสบันทึกการอนุมัติ
  formId: string;          // รหัสแบบฟอร์มที่อนุมัติ
  wardId: string;          // รหัสวอร์ด
  wardName: string;        // ชื่อวอร์ด
  date: Timestamp | Date;  // วันที่ของข้อมูล
  dateString: string;      // วันที่ในรูปแบบ string (YYYY-MM-DD)
  shift: ShiftType;        // กะการทำงาน
  status: ApprovalStatus;  // สถานะการอนุมัติ
  approvedBy: string;      // รหัสผู้อนุมัติ
  approverFirstName: string; // ชื่อผู้อนุมัติ
  approverLastName: string;  // นามสกุลผู้อนุมัติ
  approvedAt: TimestampField; // เวลาที่อนุมัติ
  note: string;            // หมายเหตุการอนุมัติ
  createdAt?: TimestampField; // เวลาที่สร้าง
  updatedAt?: TimestampField; // เวลาที่อัพเดทล่าสุด
}

/**
 * บันทึกประวัติการอนุมัติ/ปฏิเสธแบบฟอร์ม
 */
export interface ApprovalHistoryRecord {
  id?: string;                // Auto-generated ID
  formId: string;             // ID ของ WardForm ที่เกี่ยวข้อง
  wardId: string;
  wardName: string;
  date: Timestamp;            // วันที่ของ Form
  shift: ShiftType;           // กะของ Form
  action: 'APPROVED' | 'REJECTED'; // การดำเนินการ
  actorUid: string;           // UID ของผู้อนุมัติ/ปฏิเสธ
  actorName: string;          // ชื่อผู้อนุมัติ/ปฏิเสธ (เพื่อแสดงผล)
  timestamp: Timestamp;         // เวลาที่ดำเนินการ
  reason?: string;            // เหตุผล (กรณี REJECTED)
}

/**
 * ข้อมูลสรุปประจำวัน (24 ชั่วโมง)
 */
export interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | Timestamp;
  dateString: string;
  
  // ข้อมูลกะเช้า
  morningFormId?: string;
  morningPatientCensus: number;
  morningCalculatedCensus?: number;
  morningNurseManager?: number;
  morningRn?: number;
  morningPn?: number;
  morningWc?: number;
  morningNurseTotal: number;
  
  morningNewAdmit?: number;
  morningTransferIn?: number;
  morningReferIn?: number;
  morningAdmitTotal?: number;
  
  morningDischarge?: number;
  morningTransferOut?: number;
  morningReferOut?: number;
  morningDead?: number;
  morningDischargeTotal?: number;
  
  // ข้อมูลกะดึก
  nightFormId?: string;
  nightPatientCensus: number;
  nightCalculatedCensus?: number;
  nightNurseManager?: number;
  nightRn?: number;
  nightPn?: number;
  nightWc?: number;
  nightNurseTotal: number;
  
  nightNewAdmit?: number;
  nightTransferIn?: number;
  nightReferIn?: number;
  nightAdmitTotal?: number;
  
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  nightDischargeTotal?: number;
  
  // ข้อมูลรวม 24 ชั่วโมง
  dailyPatientCensus: number;
  calculatedCensus?: number;
  dailyNurseManagerTotal?: number;
  dailyRnTotal?: number;
  dailyPnTotal?: number;
  dailyWcTotal?: number;
  dailyNurseTotal: number;
  
  dailyNewAdmitTotal?: number;
  dailyTransferInTotal?: number;
  dailyReferInTotal?: number;
  dailyAdmitTotal?: number;
  
  dailyDischargeTotal?: number;
  dailyTransferOutTotal?: number;
  dailyReferOutTotal?: number;
  dailyDeadTotal?: number;
  dailyDischargeAllTotal?: number;
  
  // อัตราส่วนพยาบาลต่อผู้ป่วย
  morningNurseRatio?: number;
  nightNurseRatio?: number;
  dailyNurseRatio?: number;
  
  // ข้อมูลอื่นๆ
  opd24hr?: number;
  oldPatient?: number;
  newPatient?: number; 
  admit24hr?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  plannedDischarge?: number;
  
  // สถานะการอนุมัติ
  allFormsApproved: boolean;
  
  // ข้อมูลการบันทึก
  createdBy?: string;
  createdAt?: Date | Timestamp;
  lastUpdatedBy?: string;
  lastUpdaterFirstName?: string;
  lastUpdaterLastName?: string;
  updatedAt?: Date | Timestamp;
  
  // ระบุว่าเป็นข้อมูลตัวอย่างหรือไม่
  isDummyData?: boolean;
} 