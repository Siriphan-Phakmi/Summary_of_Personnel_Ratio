import { Timestamp } from 'firebase/firestore';

export interface DashboardSummary {
  wardId: string;
  wardName: string;
  date: Date | Timestamp;
  dateString: string;
  morningForm?: WardFormData;
  nightForm?: WardFormData;
  dailyPatientCensus: number;
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