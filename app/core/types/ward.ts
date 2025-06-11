import { TimestampField, ShiftType, FormStatus } from './user';
import { Timestamp } from 'firebase/firestore';

// Re-export types ที่จำเป็น เพื่อให้ไฟล์อื่นสามารถ import จาก ./ward ได้
export { ShiftType, FormStatus };

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
  
  // ค่าปัจจุบันที่แสดงหลังการคำนวณ (ค่าเก่าในฟิลด์เดิม)
  patientCensus: number;
  // ค่าที่ผู้ใช้กรอกหรือดึงจากวันก่อน (เพิ่มฟิลด์ใหม่)
  initialPatientCensus?: number; 
  // ค่าที่คำนวณได้จากสูตร (เพิ่มฟิลด์ใหม่)
  calculatedCensus?: number;
  
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
  rejectedBy?: string;
  rejectedAt?: TimestampField;
  supervisorFirstName?: string;
  supervisorLastName?: string;
  opd24hr?: number;
  oldPatient?: number;
  newPatient?: number;
  admit24hr?: number;
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
  initialCensus?: number;
  morningAdmissions: number; // newAdmit + transferIn + referIn
  morningDischarges: number; // discharge + transferOut + referOut + dead
  nightShiftCensus?: number;
  nightAdmissions: number; // newAdmit + transferIn + referIn
  nightDischarges: number; // discharge + transferOut + referOut + dead
  calculatedNightCensus?: number;
} 