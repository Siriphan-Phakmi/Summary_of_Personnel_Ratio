/**
 * Ward Summary Statistics Types
 * ประเภทข้อมูลสำหรับการแสดงสถิติของแผนก
 */

export interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | any;
  morningPatientCensus?: number;
  morningNurseManager?: number;
  morningRn?: number;
  morningPn?: number;
  morningWc?: number;
  morningNurseTotal?: number;
  morningNurseRatio?: number;
  morningNewAdmit?: number;
  morningTransferIn?: number;
  morningReferIn?: number;
  morningDischarge?: number;
  morningTransferOut?: number;
  morningReferOut?: number;
  morningDead?: number;
  nightPatientCensus?: number;
  nightNurseManager?: number;
  nightRn?: number;
  nightPn?: number;
  nightWc?: number;
  nightNurseTotal?: number;
  nightNurseRatio?: number;
  nightNewAdmit?: number;
  nightTransferIn?: number;
  nightReferIn?: number;
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  dailyNurseRatio?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  plannedDischarge?: number;
}

export interface WardSummaryStatsProps {
  summaries: DailySummary[];
  selectedWard: string;
}