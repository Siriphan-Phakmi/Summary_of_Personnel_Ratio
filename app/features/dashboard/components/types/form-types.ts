import { Timestamp } from 'firebase/firestore';
import { Ward } from '@/app/core/types/ward';
import { DashboardSummary, WardFormData } from './interface-types';

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
 * ข้อมูลการคำนวณจำนวนผู้ป่วย
 */
export interface PatientCensusData {
  /** จำนวนผู้ป่วยเริ่มต้น */
  initialCensus: number;
  /** จำนวนรับเข้ารวม */
  admitTotal: number;
  /** จำนวนจำหน่ายรวม */
  dischargeTotal: number;
  /** จำนวนผู้ป่วยที่คำนวณได้ */
  calculatedCensus: number;
}

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ PatientCensusCalculation
 */
export interface PatientCensusCalculationProps {
  /** ข้อมูลสำหรับการคำนวณ */
  formData: PatientCensusData;
  /** ชื่อเวร */
  shiftTitle: string;
  /** แสดงปุ่มรีเฟรชหรือไม่ */
  showRefresh?: boolean;
  /** ฟังก์ชันเมื่อกดรีเฟรช */
  onRefresh?: () => void;
}

/**
 * ข้อมูลสรุปของแผนก
 */
export interface WardSummaryData {
  /** รหัสแผนก */
  id: string;
  /** ชื่อแผนก */
  wardName: string;
  /** จำนวนผู้ป่วย */
  patientCensus: number;
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
  /** จำนวนวันที่มีข้อมูล */
  daysWithData?: number;
}

/**
 * ข้อมูลสรุปของเวร
 */
export interface WardFormSummary {
  /** จำนวนผู้ป่วย */
  patientCensus: number;
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
}

/**
 * ข้อมูลสรุปของแผนกแบ่งตามเวร
 */
export interface WardSummaryDataWithShifts {
  /** รหัสแผนก */
  id: string;
  /** ชื่อแผนก */
  wardName: string;
  /** ข้อมูลกะเช้า */
  morningShift?: WardFormSummary;
  /** ข้อมูลกะดึก */
  nightShift?: WardFormSummary;
  /** ข้อมูลรวม */
  totalData: WardFormSummary;
}

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ WardSummaryTable
 */
export interface WardSummaryTableProps {
  /** ข้อมูลที่จะแสดงในตาราง */
  data: WardSummaryDataWithShifts[];
  /** รหัสแผนกที่เลือก */
  selectedWardId: string | null;
  /** ฟังก์ชันเมื่อเลือกแผนก */
  onSelectWard: (wardId: string) => void;
  /** หัวข้อตาราง */
  title?: string;
} 