import { ReactNode } from 'react';

/**
 * คุณสมบัติพื้นฐานสำหรับปุ่มและการ์ดแผนก
 */
export interface WardControlBaseProps {
  /** ชื่อแผนก */
  wardName: string;
  /** จำนวนผู้ป่วย */
  patientCount: number;
  /** สถานะการเลือก */
  isSelected?: boolean;
  /** ฟังก์ชันที่จะทำงานเมื่อคลิก */
  onClick: () => void;
}

/**
 * คุณสมบัติสำหรับปุ่มแผนก
 */
export interface WardButtonProps extends WardControlBaseProps {
  // เพิ่มคุณสมบัติเฉพาะสำหรับ WardButton ในอนาคต
}

/**
 * คุณสมบัติสำหรับการ์ดสรุปแผนก
 */
export interface WardSummaryCardProps extends Omit<WardControlBaseProps, 'patientCount'> {
  /** จำนวนผู้ป่วย (สามารถเป็นตัวเลขหรือข้อความได้) */
  patientCount: number | string;
  /** มีข้อมูลหรือไม่ */
  hasData?: boolean;
  /** สี */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'teal';
} 