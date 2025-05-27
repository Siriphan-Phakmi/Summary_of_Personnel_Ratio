/**
 * Dashboard Component Types
 * รวมการ export ของ types ทั้งหมดสำหรับ dashboard
 */

// Re-export จากแต่ละไฟล์ย่อย
export * from './button-types';
export * from './chart-types';
export * from './form-types';
export * from './component-types';
// ใช้ re-export ที่ชัดเจนเพื่อหลีกเลี่ยงความขัดแย้งกับ DashboardSummary จาก form-types
export type { 
  WardFormData,
  // ไม่ re-export DashboardSummary จาก interface-types เพื่อหลีกเลี่ยงความซ้ำซ้อน
} from './interface-types';

// Export types ที่ใช้ทั่วไปใน dashboard
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