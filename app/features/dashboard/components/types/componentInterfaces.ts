import { Ward } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { CalendarMarker, DailyPatientData, WardSummaryDataWithShifts, TrendData } from './index';
import { PieChartDataItem } from '../EnhancedPieChart';

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
  data: WardSummaryDataWithShifts[];
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
  summaryData: WardSummaryDataWithShifts[];
  loading: boolean;
  selectedDate?: string;
}

// Props สำหรับ PatientTrendChart
export interface PatientTrendChartProps {
  data: TrendData[];
  loading?: boolean;
  selectedWardId?: string | null;
  startDate?: string;
  endDate?: string;
  onSelectWard?: (wardId: string) => void;
  handleWardChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

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