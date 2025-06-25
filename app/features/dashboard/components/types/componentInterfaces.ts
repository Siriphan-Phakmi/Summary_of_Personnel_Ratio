import { Ward } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { CalendarMarker, TrendData, WardSummaryDataWithShifts as OldWardSummaryDataWithShifts, PieChartDataItem } from './index';
import { DailyPatientData, WardSummaryDataWithShifts as NewWardSummaryDataWithShifts } from './interface-types';

// Union type for both WardSummaryDataWithShifts formats
export type AnyWardSummaryDataWithShifts = OldWardSummaryDataWithShifts | NewWardSummaryDataWithShifts;

// User interface สำหรับ ChartSection
export interface UserForChartSection {
  floor?: string;
}

// Props สำหรับ DashboardHeader
export interface DashboardHeaderProps {
  selectedDate?: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  onDateRangeChange: (value: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  user?: User | null;
  wards?: Ward[];
  applyCustomDateRange?: () => void;
  refreshData?: (wardId?: string | null) => void;
  loading?: boolean;
  dateRangeOptions?: { label: string; value: string }[];
}

// Props สำหรับ StatisticsSummary
export interface StatisticsSummaryProps {
  totalStats: any;
  loading: boolean;
}

// Props สำหรับ DashboardCalendar
export interface DashboardCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  markers: CalendarMarker[];
  events?: any[];
}

// Props สำหรับ WardSummaryTable
export interface WardSummaryTableProps {
  data: AnyWardSummaryDataWithShifts[];
  loading: boolean;
  totalStats?: any;
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  title?: string;
}

// Props สำหรับ ShiftComparisonPanel
export interface ShiftComparisonPanelProps {
  selectedWardId: string | null;
  selectedDate: string;
  wards: Ward[];
  loading: boolean;
  onWardChange: (wardId: string) => void;
  patientData: DailyPatientData[];
}

// Props สำหรับ WardSummaryDashboard
export interface WardSummaryDashboardProps {
  summaryData: AnyWardSummaryDataWithShifts[];
  loading: boolean;
  selectedDate?: string;
}

// Props สำหรับ PatientTrendChart (duplicated - use chart-types.ts instead)
// export interface PatientTrendChartProps {
//   data: TrendData[];
//   loading?: boolean;
//   selectedWardId?: string | null;
//   startDate?: string;
//   endDate?: string;
//   onSelectWard?: (wardId: string) => void;
//   handleWardChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
// }

// Props สำหรับ WardCensusButtons
export interface WardCensusButtonsProps {
  wards: Ward[];
  wardCensusMap: Map<string, number>;
  selectedWardId: string | null;
  onWardSelect: (wardId: string) => void;
  onActionSelect: (action: string) => void;
  isRegularUser?: boolean;
}

// Props สำหรับ ChartSection
export interface ChartSectionProps {
  bedCensusData: any[];
  pieChartData: PieChartDataItem[];
  loading: boolean;
  selectedWardId: string | null;
  handleSelectWard: (wardId: string) => void;
  user: UserForChartSection | null | undefined;
  isRegularUser: boolean;
} 