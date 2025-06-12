import { WardForm, ShiftType } from '@/app/core/types/ward';
import { validateFormData } from '../services/wardFormHelpers';

/**
 * Helper functions for ward form data management
 */

/**
 * ฟังก์ชันสำหรับแปลงค่าให้เป็นตัวเลขที่ปลอดภัย
 */
export const safeNumber = (value: any): number => {
  if (value === 0) return 0;
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) return 0;
  return Number(value);
};

/**
 * ตรวจสอบว่าฟิลด์ใดมีค่า 0 และสร้างรายการฟิลด์เหล่านั้น
 */
export const getFieldsWithZeroValue = (data: Partial<WardForm>): string[] => {
  const fieldsToCheck: (keyof WardForm)[] = [
    'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
    'newAdmit', 'transferIn', 'referIn',
    'transferOut', 'referOut', 'discharge', 'dead',
    'available', 'unavailable'
  ];
  
  return fieldsToCheck.filter(field => {
    const value = data[field];
    return value === 0 || value === '0';
  });
};

/**
 * ตรวจสอบว่าข้อมูลมีการเปลี่ยนแปลงหรือไม่
 */
export const hasFormDataChanged = (
  currentData: Partial<WardForm>,
  originalData: Partial<WardForm> | null
): boolean => {
  if (!originalData) return true;
  
  const fieldsToCompare: (keyof WardForm)[] = [
    'patientCensus', 'nurseManager', 'rn', 'pn', 'wc',
    'newAdmit', 'transferIn', 'referIn',
    'transferOut', 'referOut', 'discharge', 'dead',
    'available', 'unavailable'
  ];
  
  return fieldsToCompare.some(field => {
    const current = safeNumber(currentData[field]);
    const original = safeNumber(originalData[field]);
    return current !== original;
  });
};

/**
 * สร้างข้อมูลฟอร์มที่สะอาดและพร้อมส่ง
 */
export const cleanFormData = (data: Partial<WardForm>): Partial<WardForm> => {
  const cleaned: Partial<WardForm> = {};
  
  // คัดลอกข้อมูลที่จำเป็น
  const fieldsToInclude: (keyof WardForm)[] = [
    'patientCensus', 'initialPatientCensus', 'calculatedCensus',
    'nurseManager', 'rn', 'pn', 'wc',
    'newAdmit', 'transferIn', 'referIn',
    'transferOut', 'referOut', 'discharge', 'dead',
    'available', 'unavailable',
    'wardId', 'shift', 'date', 'dateString',
    'status', 'isDraft'
  ];
  
  fieldsToInclude.forEach(field => {
    if (data[field] !== undefined) {
      if (typeof data[field] === 'number' || field.includes('Census') || 
          ['nurseManager', 'rn', 'pn', 'wc', 'newAdmit', 'transferIn', 'referIn',
           'transferOut', 'referOut', 'discharge', 'dead', 'available', 'unavailable'].includes(field)) {
        (cleaned as any)[field] = safeNumber(data[field]);
      } else {
        (cleaned as any)[field] = data[field];
      }
    }
  });
  
  return cleaned;
};

/**
 * ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก
 */
export const validateFormBeforeSave = (data: Partial<WardForm>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // ตรวจสอบข้อมูลพื้นฐาน
  if (!data.wardId) errors.push('กรุณาเลือกแผนก');
  if (!data.shift) errors.push('กรุณาเลือกกะ');
  if (!data.date) errors.push('กรุณาเลือกวันที่');
  
  // ตรวจสอบข้อมูลอัตรากำลัง
  const staffFields = ['nurseManager', 'rn', 'pn', 'wc'];
  const hasStaffData = staffFields.some(field => safeNumber(data[field as keyof WardForm]) > 0);
  if (!hasStaffData) {
    warnings.push('ไม่มีข้อมูลอัตรากำลัง');
  }
  
  // ใช้ validation จาก service
  const serviceValidation = validateFormData(data);
  if (!serviceValidation.isValid) {
    errors.push(...serviceValidation.missingFields.map(field => `ข้อมูล ${field} ไม่ครบถ้วน`));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * สร้างข้อความสรุปสำหรับการยืนยัน
 */
export const createConfirmationSummary = (data: Partial<WardForm>): string => {
  const summary: string[] = [];
  
  // ข้อมูลผู้ป่วย
  if (data.patientCensus !== undefined) {
    summary.push(`จำนวนผู้ป่วย: ${safeNumber(data.patientCensus)} คน`);
  }
  
  // ข้อมูลอัตรากำลัง
  const staffTotal = safeNumber(data.nurseManager) + safeNumber(data.rn) + 
                    safeNumber(data.pn) + safeNumber(data.wc);
  if (staffTotal > 0) {
    summary.push(`อัตรากำลังรวม: ${staffTotal} คน`);
  }
  
  // ข้อมูลการรับ-จำหน่าย
  const admissions = safeNumber(data.newAdmit) + safeNumber(data.transferIn) + safeNumber(data.referIn);
  const discharges = safeNumber(data.discharge) + safeNumber(data.transferOut) + 
                    safeNumber(data.referOut) + safeNumber(data.dead);
  
  if (admissions > 0) summary.push(`รับเข้า: ${admissions} คน`);
  if (discharges > 0) summary.push(`จำหน่าย: ${discharges} คน`);
  
  return summary.join(' | ');
};

/**
 * ตรวจสอบว่าเป็นข้อมูลที่มีความผิดปกติหรือไม่
 */
export const detectAnomalies = (data: Partial<WardForm>): string[] => {
  const anomalies: string[] = [];
  
  // ตรวจสอบจำนวนผู้ป่วยที่ผิดปกติ
  const patientCount = safeNumber(data.patientCensus);
  if (patientCount > 100) {
    anomalies.push(`จำนวนผู้ป่วยสูงผิดปกติ (${patientCount} คน)`);
  }
  
  // ตรวจสอบอัตรากำลังที่ผิดปกติ
  const totalStaff = safeNumber(data.nurseManager) + safeNumber(data.rn) + 
                    safeNumber(data.pn) + safeNumber(data.wc);
  if (totalStaff > 50) {
    anomalies.push(`อัตรากำลังสูงผิดปกติ (${totalStaff} คน)`);
  }
  
  // ตรวจสอบการรับ-จำหน่ายที่ผิดปกติ
  const dischargeTotal = safeNumber(data.discharge) + safeNumber(data.transferOut) + 
                        safeNumber(data.referOut) + safeNumber(data.dead);
  if (dischargeTotal > patientCount) {
    anomalies.push('จำนวนที่จำหน่ายมากกว่าจำนวนผู้ป่วย');
  }
  
  return anomalies;
};

/**
 * สร้างข้อมูลเริ่มต้นสำหรับฟอร์มใหม่
 */
export const createDefaultFormData = (
  wardId: string,
  shift: ShiftType,
  date: Date
): Partial<WardForm> => {
  return {
    wardId: wardId.toUpperCase(),
    shift,
    date: date,
    dateString: date.toISOString().split('T')[0],
    patientCensus: 0,
    nurseManager: 0,
    rn: 0,
    pn: 0,
    wc: 0,
    newAdmit: 0,
    transferIn: 0,
    referIn: 0,
    transferOut: 0,
    referOut: 0,
    discharge: 0,
    dead: 0,
    available: 0,
    unavailable: 0,
    isDraft: true
  };
};

export default {
  safeNumber,
  getFieldsWithZeroValue,
  hasFormDataChanged,
  cleanFormData,
  validateFormBeforeSave,
  createConfirmationSummary,
  detectAnomalies,
  createDefaultFormData
}; 