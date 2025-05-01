import { TimestampField } from './user';
import { Timestamp } from 'firebase/firestore';

/**
 * ประเภทกะการทำงาน
 */
export enum ShiftType {
  MORNING = 'morning',
  NIGHT = 'night'
}

/**
 * สถานะของแบบฟอร์ม
 */
export enum FormStatus {
  DRAFT = 'draft',
  FINAL = 'final',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * ข้อมูลพื้นฐานของแผนก (Ward)
 */
export interface Ward {
  id: string;
  wardId: string;
  wardName: string;
  description?: string;
  active: boolean;
  wardOrder?: number; // ลำดับการแสดงผล
  createdAt: TimestampField; 
  updatedAt: TimestampField;
}

/**
 * ข้อมูลการบันทึกแบบฟอร์มประจำวัน
 */
export interface WardForm {
  id?: string;
  wardId: string;
  wardName: string;
  date: TimestampField; // serverTimestamp หรือ Date
  dateString?: string; // วันที่ในรูปแบบ string (YYYY-MM-DD)
  shift: ShiftType;
  patientCensus: number;
  totalPatientCensus?: number; // ยอดผู้ป่วยหลังจากคำนวณรับเข้า-จำหน่าย
  nurseManager: number;
  rn: number;
  pn: number;
  wc: number;
  newAdmit: number;
  transferIn: number;
  referIn: number;
  transferOut: number;
  referOut: number;
  discharge: number;
  dead: number;
  available: number;
  unavailable: number;
  plannedDischarge: number;
  comment?: string;
  recorderFirstName: string;
  recorderLastName: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: TimestampField; 
  updatedAt: TimestampField;
  status: FormStatus;
  isDraft: boolean;
  finalizedAt?: TimestampField;
  approvedBy?: string;
  approverFirstName?: string;
  approverLastName?: string;
  approvedAt?: TimestampField;
  rejectionReason?: string;
}

/**
 * ข้อมูลการอนุมัติแบบฟอร์ม
 */
export interface FormApproval {
  id?: string;
  formId: string;
  wardId: string;
  wardName: string;
  date: TimestampField; // serverTimestamp หรือ Date
  shift: ShiftType;
  status: 'approved' | 'rejected';
  approvedBy: string;
  approverFirstName: string;
  approverLastName: string;
  approvedAt: TimestampField; 
  rejectionReason?: string;
  editedBeforeApproval?: boolean;
  modifiedData?: Partial<WardForm>;
}

/**
 * ข้อมูลการคำนวณ Patient Census
 */
export interface CensusCalculation {
  previousNightCensus?: number;
  morningShiftCensus?: number;
  morningAdmissions: number; // newAdmit + transferIn + referIn
  morningDischarges: number; // discharge + transferOut + referOut + dead
  nightShiftCensus?: number;
  nightAdmissions: number; // newAdmit + transferIn + referIn
  nightDischarges: number; // discharge + transferOut + referOut + dead
  calculatedNightCensus?: number;
} 