/**
 * Dashboard Component Types
 * รวมการ export ของ types ทั้งหมดสำหรับ dashboard
 */

'use client';

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
  WardSummaryDataWithShifts,
  DailyPatientData,
  ShiftSummaryData
} from './interface-types';

export type {
  DashboardSummary,
  WardSummaryDataWithShifts,
  DailyPatientData,
  ShiftSummaryData
};

// Common types used across dashboard components
export interface WardCensusData {
  wardId: string;
  wardName: string;
  occupiedBeds: number;
  totalBeds: number;
  percentage: number;
}

export interface WardCensusMapEntry {
  wardName: string;
  patientCount: number;
  morningPatientCount: number;
  nightPatientCount: number;
}

export interface CalendarMarker {
  date: string;
  status: 'complete' | 'partial' | 'missing' | 'draft';
}

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
// export * from './form-types'; // Obsolete, removing
export * from './interface-types';
export * from './dashboardPageTypes';
export * from './shiftComparisonTypes';

// ตัดออกเนื่องจาก types เหล่านี้ได้ประกาศในไฟล์นี้แล้ว
// export type { CalendarMarker, TrendData } from './chart-types';
// export type { WardCensusData } from './component-types'; 