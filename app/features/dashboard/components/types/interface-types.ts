import { Timestamp } from 'firebase/firestore';

/**
 * ข้อมูลสรุปของแผนกสำหรับหน้า Dashboard
 */
export interface DashboardSummary {
  /** รหัสแผนก */
  wardId: string;
  /** ชื่อแผนก */
  wardName: string;
  /** วันที่ */
  date: Date | Timestamp;
  /** วันที่ในรูปแบบข้อความ */
  dateString: string;
  /** ข้อมูลแบบฟอร์มกะเช้า */
  morningForm?: WardFormData;
  /** ข้อมูลแบบฟอร์มกะดึก */
  nightForm?: WardFormData;
  /** จำนวนผู้ป่วยรวมทั้งวัน */
  dailyPatientCensus: number;
}

/**
 * ข้อมูลในแบบฟอร์มของแผนก
 */
export interface WardFormData {
  /** รหัสแบบฟอร์ม */
  id?: string;
  /** จำนวนผู้ป่วย */
  patientCensus: number;
  /** จำนวนผู้ป่วยที่คำนวณได้ */
  calculatedCensus?: number;
  /** จำนวนหัวหน้าเวร */
  nurseManager: number;
  /** จำนวนพยาบาลวิชาชีพ */
  rn: number;
  /** จำนวนพยาบาลเทคนิค */
  pn: number;
  /** จำนวนผู้ช่วยพยาบาล */
  wc: number;
  /** จำนวนรับใหม่ */
  newAdmit: number;
  /** จำนวนรับย้าย */
  transferIn: number;
  /** จำนวนรับ refer */
  referIn: number;
  /** จำนวนจำหน่าย */
  discharge: number;
  /** จำนวนส่งย้าย */
  transferOut: number;
  /** จำนวนส่ง refer */
  referOut: number;
  /** จำนวนเสียชีวิต */
  dead: number;
  /** จำนวนเตียงว่าง */
  available: number;
  /** จำนวนเตียงไม่ว่าง */
  unavailable: number;
  /** จำนวนที่วางแผนจำหน่าย */
  plannedDischarge: number;
  /** จำนวนรับเข้ารวม */
  admitTotal?: number;
  /** จำนวนจำหน่ายรวม */
  dischargeTotal?: number;
  /** จำนวนผู้ป่วยเริ่มต้น */
  initialPatientCensus?: number;
} 

/**
 * Data structure for daily patient counts, used in comparison views.
 */
export interface DailyPatientData {
  date: string;
  displayDate: string;
  wardId: string;
  wardName: string;
  morningPatientCount: number;
  nightPatientCount: number;
  totalPatientCount: number;
} 