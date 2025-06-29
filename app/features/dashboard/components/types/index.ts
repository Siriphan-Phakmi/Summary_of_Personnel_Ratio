/**
 * @fileoverview This barrel file exports all dashboard-related types.
 * It centralizes all type definitions for easy importing across the feature.
 */

export * from './button-types';
export * from './chart-types';
export * from './shiftComparisonTypes';

// Selective exports to avoid naming conflicts
export type {
  DashboardSummary as InterfaceDashboardSummary,
  DailyPatientData,
  WardSummaryDataWithShifts,
  ShiftSummaryData,
  WardFormSummary,
  CalendarMarker,
  TrendData
} from './interface-types';

export type {
  DashboardSummary as PageDashboardSummary
} from './dashboardPageTypes';

// Selective exports to avoid naming conflicts
export type { 
  ChartSectionProps,
  DashboardHeaderProps,
  StatisticsSummaryProps,
  DashboardCalendarProps,
  WardSummaryTableProps,
  WardCensusButtonsProps,
  UserForChartSection,
  AnyWardSummaryDataWithShifts
} from './componentInterfaces';

export type {
  ShiftComparisonPanelProps as ComponentShiftComparisonPanelProps,
  WardSummaryDashboardProps as ComponentWardSummaryDashboardProps,
  WardSummaryGridProps as ComponentWardSummaryGridProps
} from './component-types';

// PatientCensusCalculation props
export interface PatientCensusCalculationProps {
  formData: any;
  shiftTitle: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

// ViewType enum for dashboard state
export type ViewType = 'summary' | 'detailed' | 'chart';

// WardCensusData interface
export interface WardCensusData {
  id: string;
  wardName: string;
  patientCount: number;
  morningPatientCount?: number;
  nightPatientCount?: number;
}

// Re-export core form types for convenience within the dashboard feature
export type { Ward, WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';