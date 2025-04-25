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
  id?: string;                    // รหัสข้อมูลสรุป
  wardId: string;                 // รหัสวอร์ด
  wardName: string;               // ชื่อวอร์ด
  date: Timestamp | Date;         // วันที่
  dateString: string;             // วันที่ในรูปแบบ string (YYYY-MM-DD)
  
  // ข้อมูลกะเช้า
  morningFormId?: string;         // รหัสแบบฟอร์มกะเช้า
  morningPatientCensus: number;   // จำนวนผู้ป่วยกะเช้า
  morningNurseManager: number;    // จำนวนหัวหน้าพยาบาลกะเช้า
  morningRn: number;              // จำนวนพยาบาลวิชาชีพกะเช้า
  morningPn: number;              // จำนวนพยาบาลเทคนิคกะเช้า
  morningWc: number;              // จำนวนผู้ช่วยพยาบาลกะเช้า
  morningNurseTotal: number;      // รวมจำนวนพยาบาลกะเช้าทั้งหมด
  
  morningNewAdmit: number;        // จำนวนรับใหม่กะเช้า
  morningTransferIn: number;      // จำนวนย้ายเข้ากะเช้า
  morningReferIn: number;         // จำนวนส่งตัวมารักษาต่อกะเช้า
  morningAdmitTotal: number;      // รวมจำนวนผู้ป่วยเข้ากะเช้า
  
  morningDischarge: number;       // จำนวนจำหน่ายกะเช้า
  morningTransferOut: number;     // จำนวนย้ายออกกะเช้า
  morningReferOut: number;        // จำนวนส่งตัวไปรักษาต่อกะเช้า
  morningDead: number;            // จำนวนเสียชีวิตกะเช้า
  morningDischargeTotal: number;  // รวมจำนวนผู้ป่วยออกกะเช้า
  
  // ข้อมูลกะดึก
  nightFormId?: string;           // รหัสแบบฟอร์มกะดึก
  nightPatientCensus: number;     // จำนวนผู้ป่วยกะดึก
  nightNurseManager: number;      // จำนวนหัวหน้าพยาบาลกะดึก
  nightRn: number;                // จำนวนพยาบาลวิชาชีพกะดึก
  nightPn: number;                // จำนวนพยาบาลเทคนิคกะดึก
  nightWc: number;                // จำนวนผู้ช่วยพยาบาลกะดึก
  nightNurseTotal: number;        // รวมจำนวนพยาบาลกะดึกทั้งหมด
  
  nightNewAdmit: number;          // จำนวนรับใหม่กะดึก
  nightTransferIn: number;        // จำนวนย้ายเข้ากะดึก
  nightReferIn: number;           // จำนวนส่งตัวมารักษาต่อกะดึก
  nightAdmitTotal: number;        // รวมจำนวนผู้ป่วยเข้ากะดึก
  
  nightDischarge: number;         // จำนวนจำหน่ายกะดึก
  nightTransferOut: number;       // จำนวนย้ายออกกะดึก
  nightReferOut: number;          // จำนวนส่งตัวไปรักษาต่อกะดึก
  nightDead: number;              // จำนวนเสียชีวิตกะดึก
  nightDischargeTotal: number;    // รวมจำนวนผู้ป่วยออกกะดึก
  
  // ข้อมูลสรุป 24 ชั่วโมง
  dailyPatientCensus: number;      // จำนวนผู้ป่วยคงเหลือปัจจุบัน (ยอดสุดท้ายของวัน)
  dailyNurseManagerTotal: number;  // จำนวนหัวหน้าพยาบาลทั้งวัน
  dailyRnTotal: number;            // จำนวนพยาบาลวิชาชีพทั้งวัน
  dailyPnTotal: number;            // จำนวนพยาบาลเทคนิคทั้งวัน
  dailyWcTotal: number;            // จำนวนผู้ช่วยพยาบาลทั้งวัน
  dailyNurseTotal: number;         // รวมจำนวนพยาบาลทั้งวัน
  
  dailyNewAdmitTotal: number;      // รวมจำนวนรับใหม่ทั้งวัน
  dailyTransferInTotal: number;    // รวมจำนวนย้ายเข้าทั้งวัน
  dailyReferInTotal: number;       // รวมจำนวนส่งตัวมารักษาต่อทั้งวัน
  dailyAdmitTotal: number;         // รวมจำนวนผู้ป่วยเข้าทั้งวัน
  
  dailyDischargeTotal: number;     // รวมจำนวนจำหน่ายทั้งวัน
  dailyTransferOutTotal: number;   // รวมจำนวนย้ายออกทั้งวัน
  dailyReferOutTotal: number;      // รวมจำนวนส่งตัวไปรักษาต่อทั้งวัน
  dailyDeadTotal: number;          // รวมจำนวนเสียชีวิตทั้งวัน
  dailyDischargeAllTotal: number;  // รวมจำนวนผู้ป่วยออกทั้งวัน
  
  // อัตราส่วนพยาบาลต่อผู้ป่วย
  morningNurseRatio: number;       // อัตราส่วนพยาบาลต่อผู้ป่วยกะเช้า
  nightNurseRatio: number;         // อัตราส่วนพยาบาลต่อผู้ป่วยกะดึก
  dailyNurseRatio: number;         // อัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ยทั้งวัน
  
  // ข้อมูลอื่นๆ
  availableBeds: number;           // จำนวนเตียงว่าง
  unavailableBeds: number;         // จำนวนเตียงไม่พร้อมใช้งาน
  plannedDischarge: number;        // จำนวนผู้ป่วยที่วางแผนจำหน่ายในวันถัดไป
  opd24hr?: number;                // จำนวนผู้ป่วยนอก 24 ชั่วโมง
  oldPatient?: number;             // จำนวนผู้ป่วยเก่า
  newPatient?: number;             // จำนวนผู้ป่วยใหม่
  admit24hr?: number;              // จำนวนรับไว้ในโรงพยาบาล 24 ชั่วโมง
  allFormsApproved?: boolean;      // สถานะการอนุมัติแบบฟอร์มทั้งหมด (true = อนุมัติแล้วทั้งหมด)
  
  // ข้อมูลการบันทึก
  createdBy?: string;              // รหัสผู้สร้าง
  createdAt?: TimestampField;      // เวลาที่สร้าง
  lastUpdatedBy?: string;          // รหัสผู้อัพเดทล่าสุด
  lastUpdaterFirstName?: string;   // ชื่อผู้อัพเดทล่าสุด
  lastUpdaterLastName?: string;    // นามสกุลผู้อัพเดทล่าสุด
  updatedAt?: TimestampField;      // เวลาที่อัพเดทล่าสุด
} 