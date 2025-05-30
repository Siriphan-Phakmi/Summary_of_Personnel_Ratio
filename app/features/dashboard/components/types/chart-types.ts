/**
 * ข้อมูลสำหรับกราฟแท่ง
 */
export interface EnhancedBarChartProps {
  /** ข้อมูลสำหรับแสดงในกราฟแท่ง */
  data: {
    /** รหัสแผนก */
    id: string;
    /** ชื่อแผนก */
    wardName: string;
    /** จำนวนผู้ป่วยรวม */
    patientCount: number;
    /** จำนวนผู้ป่วยกะเช้า */
    morningPatientCount?: number;
    /** จำนวนผู้ป่วยกะดึก */
    nightPatientCount?: number;
  }[];
  /** รหัสแผนกที่เลือก */
  selectedWardId: string | null;
  /** ฟังก์ชันเมื่อเลือกแผนก */
  onSelectWard: (wardId: string) => void;
  /** แสดงข้อมูลแยกตามกะหรือไม่ */
  showShiftData?: boolean;
}

/**
 * ข้อมูลสำหรับกราฟวงกลม
 */
export interface EnhancedPieChartProps {
  /** ข้อมูลสำหรับแสดงในกราฟวงกลม */
  data: {
    /** รหัสแผนก */
    id: string;
    /** ชื่อแผนก */
    wardName: string;
    /** จำนวนผู้ป่วย */
    patientCount: number;
  }[];
  /** รหัสแผนกที่เลือก */
  selectedWardId: string | null;
  /** ฟังก์ชันเมื่อเลือกแผนก */
  onSelectWard: (wardId: string) => void;
}

/**
 * ข้อมูลสำหรับกราฟแนวโน้ม
 */
export interface PatientTrendData {
  /** วันที่ */
  date: string;
  /** จำนวนผู้ป่วย */
  patientCount: number;
  /** จำนวนรับเข้า */
  admitCount: number;
  /** จำนวนจำหน่าย */
  dischargeTotal: number;
}

/**
 * ข้อมูลสำหรับกราฟแนวโน้ม
 */
export interface PatientTrendChartProps {
  /** ข้อมูลสำหรับแสดงในกราฟแนวโน้ม */
  data: PatientTrendData[];
  /** หัวข้อกราฟ */
  title?: string;
}

/**
 * ข้อมูลสำหรับกราฟรายแผนก
 */
export interface PieChartDataItem {
  /** รหัสแผนก */
  id: string;
  /** ชื่อแผนก */
  wardName: string;
  /** จำนวนเตียงว่าง */
  value: number;
  /** จำนวนเตียงทั้งหมด */
  total: number;
  /** จำนวนเตียงไม่ว่าง */
  unavailable: number;
  /** จำนวนเตียงที่วางแผนจำหน่าย */
  plannedDischarge: number;
} 