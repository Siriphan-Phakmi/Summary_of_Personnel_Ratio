/**
 * Types สำหรับหน้า Dashboard
 */

'use client';

import { Ward } from '@/app/features/ward-form/types/ward';

export interface DashboardFilterState {
  wardFilter: string; // "all" หรือรหัสแผนก
  dateRange: [Date, Date] | null;
}

// ข้อมูลสรุปเตียงสำหรับการแสดงผลแยกตามวอร์ด
export interface WardCensusData {
  wardId: string;
  wardName: string;
  patientCount: number;
  morningShiftCount?: number;
  nightShiftCount?: number;
}

export interface WardCensusMapEntry {
  wardId: string;
  wardName: string;
  censusData?: {
    occupiedBeds: number;
    totalBeds: number;
    percentage: number;
  };
}

// ข้อมูลสรุปรวมสำหรับ Dashboard
export interface DashboardSummary {
  totalWards: number;
  totalPatients: number;
  completionRate: number;
  wardsAboveCapacity: number;
}

// การกำหนดค่าสีสำหรับแผนภูมิ
export interface ChartColorConfig {
  backgroundColors: string[];
  borderColors: string[];
} 