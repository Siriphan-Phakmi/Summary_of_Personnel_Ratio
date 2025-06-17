import { Timestamp } from 'firebase/firestore';
import { Ward, WardForm } from '@/app/features/ward-form/types/ward';

/**
 * Main data structures for the dashboard feature.
 */

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

// Represents a single marker on the calendar view
export type CalendarMarker = { date: string; status: 'draft' | 'final' | 'approved' };

// Data for the patient census count in various components
export interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

// Data for the patient trend line chart
export interface TrendData {
  date: string;
  patientCount: number;
  admitCount: number;
  dischargeCount: number; // Corrected from dischargeTotal
  wardData?: {
    [wardId: string]: {
      wardName: string;
      patientCount: number;
    }
  };
}

// The primary summary structure for a single shift (morning or night)
export interface WardFormSummary {
  patientCensus: number;
  admitted: number;
  discharged: number;
  transferredIn: number;
  transferredOut: number;
  deaths: number;
  availableBeds: number;
  occupiedBeds: number;
}

// Combines morning, night, and total summaries for a single ward to be displayed in the table
export interface WardSummaryDataWithShifts {
  id: string;
  wardName: string;
  morningShift?: WardFormSummary;
  nightShift?: WardFormSummary;
  totalData: WardFormSummary;
}

// ประเภทของการดูข้อมูล
export enum ViewType {
  SUMMARY = 'summary',
  WARD_DETAIL = 'ward_detail'
}

// เพิ่ม interface สำหรับข้อมูลกราฟเส้นรายวัน
export interface DailyPatientData {
  date: string;
  displayDate: string;
  wardId: string;
  wardName: string;
  morningPatientCount: number;
  nightPatientCount: number;
  totalPatientCount: number;
}

export interface PatientCensusData {
  initialCensus: number;
  admitTotal: number;
  dischargeTotal: number;
  calculatedCensus: number;
}

export interface WardButtonProps {
  wardName: string;
  patientCount: number;
  isSelected?: boolean;
  onClick: () => void;
}

export interface WardSummaryCardProps {
  wardName: string;
  patientCount: number;
  isSelected?: boolean;
  onClick: () => void;
}

export interface WardSummaryGridProps {
  wards: {
    id: string;
    wardName: string;
    patientCount: number;
  }[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
}

export interface WardSummaryDashboardProps {
  date: string;
  wards: {
    id: string;
    wardName: string;
    patientCount: number;
  }[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  summary: DashboardSummary | null;
  loading: boolean;
}

export interface PatientCensusCalculationProps {
  formData: PatientCensusData;
  shiftTitle: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export interface EnhancedBarChartProps {
  data: {
    id: string;
    wardName: string;
    patientCount: number;
    morningPatientCount?: number;
    nightPatientCount?: number;
  }[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  showShiftData?: boolean;
}

export interface EnhancedPieChartProps {
  data: {
    id: string;
    wardName: string;
    patientCount: number;
  }[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
}

export interface PatientTrendData {
  date: string;
  patientCount: number;
  admitCount: number;
  dischargeTotal: number;
}

export interface PatientTrendChartProps {
  data: TrendData[];
  title?: string;
}

export interface WardSummaryData {
  id: string;
  wardName: string;
  patientCensus: number;
  nurseManager: number;
  rn: number;
  pn: number;
  wc: number;
  newAdmit: number;
  transferIn: number;
  referIn: number;
  discharge: number;
  transferOut: number;
  referOut: number;
  dead: number;
  available: number;
  unavailable: number;
  plannedDischarge: number;
  daysWithData?: number;
}

export interface WardSummaryTableProps {
  data: WardSummaryData[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  title?: string;
}

export interface ShiftComparisonPanelProps {
  summary: DashboardSummary | null;
  wardName: string;
  allWards?: Ward[];
  onWardSelect?: (wardId: string) => void;
} 