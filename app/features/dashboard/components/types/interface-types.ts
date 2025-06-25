import { Timestamp } from 'firebase/firestore';
import { WardForm } from '@/app/features/ward-form/types/ward';

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
  morningForm?: WardForm;
  /** ข้อมูลแบบฟอร์มกะดึก */
  nightForm?: WardForm;
  /** จำนวนผู้ป่วยรวมทั้งวัน */
  dailyPatientCensus: number;
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

/**
 * Data structure for shift-specific summaries.
 */
export interface ShiftSummaryData {
  patientCensus: number;
  admitted: number;
  discharged: number;
  transferredIn: number;
  transferredOut: number;
  deaths: number;
}

/**
 * Represents the comprehensive summary data for a ward, including both shifts.
 * This is used for the main summary table.
 */
export interface WardSummaryDataWithShifts {
  wardId: string;
  wardName: string;
  morningShiftData: ShiftSummaryData;
  nightShiftData: ShiftSummaryData;
  totalData: ShiftSummaryData;
}

/**
 * Ward form summary data with bed information
 */
export interface WardFormSummary {
  patientCensus: number;
  admitted: number;
  transferredIn: number;
  discharged: number;
  transferredOut: number;
  deaths: number;
  availableBeds: number;
  occupiedBeds: number;
} 