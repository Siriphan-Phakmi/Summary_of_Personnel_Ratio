import { Timestamp } from 'firebase/firestore';
import { Ward } from '@/app/core/types/ward';

// นำเข้า DashboardSummary จาก types/form-types.ts แทนการประกาศซ้ำ
import { DashboardSummary } from './types/form-types';

// ส่งออก DashboardSummary ที่นำเข้ามา
export type { DashboardSummary };

// เพิ่ม interface จาก DashboardPage.tsx
export interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

// ประเภทของการดูข้อมูล
export enum ViewType {
  SUMMARY = 'summary',
  WARD_DETAIL = 'ward_detail'
}

// นำเข้า type สำหรับ markers
export type CalendarMarker = { date: string; status: 'draft' | 'final' | 'approved' };

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

export interface WardFormData {
  id?: string;
  patientCensus: number;
  calculatedCensus?: number;
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
  admitTotal?: number;
  dischargeTotal?: number;
  initialPatientCensus?: number;
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

export interface ShiftSummaryProps {
  title: string; // เช่น "กะเช้า", "กะดึก"
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
  admitTotal?: number;
  dischargeTotal?: number;
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
  data: PatientTrendData[];
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

export interface WardFormSummary {
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
}

export interface WardSummaryDataWithShifts {
  id: string;
  wardName: string;
  morningShift?: WardFormSummary;
  nightShift?: WardFormSummary;
  totalData: WardFormSummary;
} 