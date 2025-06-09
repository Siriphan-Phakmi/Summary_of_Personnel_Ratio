/**
 * Dashboard Component Types
 * รวมการ export ของ types ทั้งหมดสำหรับ dashboard
 */

// Import types from componentInterfaces.ts
import type {
  UserForChartSection,
  DashboardHeaderProps,
  StatisticsSummaryProps,
  DashboardCalendarProps,
  WardSummaryTableProps,
  ShiftComparisonPanelProps,
  WardSummaryDashboardProps,
  PatientTrendChartProps as PatientTrendChartPropsFromInterface,
  WardCensusButtonsProps,
  ChartSectionProps
} from './componentInterfaces';

// Re-export with 'export type' syntax
export type { 
  UserForChartSection,
  DashboardHeaderProps,
  StatisticsSummaryProps,
  DashboardCalendarProps,
  WardSummaryTableProps,
  ShiftComparisonPanelProps,
  WardSummaryDashboardProps,
  PatientTrendChartPropsFromInterface,
  WardCensusButtonsProps,
  ChartSectionProps
};

// Import types from chart-types.ts
import type {
  EnhancedBarChartProps,
  EnhancedPieChartProps,
  PatientTrendData,
  PatientTrendChartProps as PatientTrendChartPropsFromChart,
  PieChartDataItem
} from './chart-types';

export type {
  EnhancedBarChartProps,
  EnhancedPieChartProps,
  PatientTrendData,
  PatientTrendChartPropsFromChart,
  PieChartDataItem
};

// Import types from interface-types.ts
import type {
  DashboardSummary,
  WardFormData
} from './interface-types';

export type {
  DashboardSummary,
  WardFormData
};

// Common types used across dashboard components
export interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

export type CalendarMarker = { 
  date: string; 
  status: 'draft' | 'final' | 'approved' 
}; 

export interface TrendData {
  date: string;
  patientCount: number;
  admitCount: number;
  dischargeCount: number;
  wardData?: {
    [wardId: string]: {
      wardName: string;
      patientCount: number;
      admitCount: number;
      dischargeCount: number;
    }
  };
} 

export * from './button-types';
export * from './chart-types';
export * from './component-types';
export * from './form-types';
export * from './interface-types';

// Specific exports that might not be covered by the above
export type { CalendarMarker, TrendData } from './chart-types';
export type { WardCensusData } from './component-types'; 