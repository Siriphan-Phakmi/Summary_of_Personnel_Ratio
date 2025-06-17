import { Ward } from '@/app/features/ward-form/types/ward';
import { DashboardSummary } from './interface-types';

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ WardSummaryGrid
 */
export interface WardSummaryGridProps {
  /** ข้อมูลรายแผนก */
  wards: {
    id: string;
    wardName: string;
    patientCount: number;
  }[];
  /** รหัสแผนกที่เลือก */
  selectedWardId: string | null;
  /** ฟังก์ชันเมื่อเลือกแผนก */
  onSelectWard: (wardId: string) => void;
}

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ WardSummaryDashboard
 */
export interface WardSummaryDashboardProps {
  /** วันที่ */
  date: string;
  /** ข้อมูลรายแผนก */
  wards: {
    id: string;
    wardName: string;
    patientCount: number;
  }[];
  /** รหัสแผนกที่เลือก */
  selectedWardId: string | null;
  /** ฟังก์ชันเมื่อเลือกแผนก */
  onSelectWard: (wardId: string) => void;
  /** ข้อมูลสรุป */
  summary: DashboardSummary | null;
  /** สถานะการโหลด */
  loading: boolean;
}

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ ShiftSummaryProps
 */
export interface ShiftSummaryProps {
  /** ชื่อเวร (เช่น "กะเช้า", "กะดึก") */
  title: string;
  /** จำนวนผู้ป่วย */
  patientCensus: number;
  /** จำนวนหัวหน้าเวร */
  nurseManager: number;
  /** จำนวนพยาบาลวิชาชีพ */
  rn: number;
  /** จำนวนพยาบาลเทคนิค */
  pn: number;
  /** จำนวนผู้ช่วยพยาบาล */
  wc: number;
  /** จำนวนรับใหม่ */
  newAdmit: number;
  /** จำนวนรับย้าย */
  transferIn: number;
  /** จำนวนรับ refer */
  referIn: number;
  /** จำนวนจำหน่าย */
  discharge: number;
  /** จำนวนส่งย้าย */
  transferOut: number;
  /** จำนวนส่ง refer */
  referOut: number;
  /** จำนวนเสียชีวิต */
  dead: number;
  /** จำนวนรับเข้ารวม */
  admitTotal?: number;
  /** จำนวนจำหน่ายรวม */
  dischargeTotal?: number;
}

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ ShiftComparisonPanel
 */
export interface ShiftComparisonPanelProps {
  /** ข้อมูลสรุป */
  summary: DashboardSummary | null;
  /** ชื่อแผนก */
  wardName: string;
  /** ข้อมูลทุกแผนก */
  allWards?: Ward[];
  /** ฟังก์ชันเมื่อเลือกแผนก */
  onWardSelect?: (wardId: string) => void;
}

/**
 * คุณสมบัติสำหรับคอมโพเนนต์ NoDataMessage
 */
export interface NoDataMessageProps {
  /** ข้อความหลัก */
  message: string;
  /** ข้อความรอง */
  subMessage?: string;
  /** ไอคอนที่จะแสดง */
  icon?: 'user' | 'chart' | 'table' | 'compare' | 'calendar' | 'error';
  /** สีของไอคอน */
  iconColor?: string;
  /** คลาสเพิ่มเติม */
  className?: string;
} 