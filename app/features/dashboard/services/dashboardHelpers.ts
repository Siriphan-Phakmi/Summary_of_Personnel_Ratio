'use client';

import { Ward, WardForm } from '@/app/core/types/ward';
import { User, UserRole } from '@/app/core/types/user';
import { fetchAllWardCensus as fetchAllWardCensusFromWardForm } from '@/app/features/ward-form/services/wardFormService';
import { Logger } from '@/app/core/utils/logger';

/**
 * ดึงข้อมูล Census ของทุก Ward สำหรับ Dashboard
 * @param selectedDate วันที่เลือก
 * @returns Map ของจำนวนผู้ป่วยแยกตามแผนก
 */
export const fetchAllWardCensusForDashboard = async (selectedDate: string): Promise<Map<string, number>> => {
  try {
    Logger.info(`[fetchAllWardCensusForDashboard] Fetching census data for date: ${selectedDate}`);
    
    // ใช้ function จาก ward-form service ที่มี offline handling แล้ว
    const censusMap = await fetchAllWardCensusFromWardForm(selectedDate);
    
    Logger.info(`[fetchAllWardCensusForDashboard] Successfully fetched census data for ${censusMap.size} wards`);
    return censusMap;
    
  } catch (error) {
    Logger.error(`[fetchAllWardCensusForDashboard] Error fetching census data:`, error);
    // Return empty map instead of throwing to prevent dashboard crash
    return new Map<string, number>();
  }
};

/**
 * ตรวจสอบสิทธิ์การเข้าถึงข้อมูล Ward
 * @param user ผู้ใช้
 * @param ward Ward ที่ต้องการตรวจสอบ
 * @returns true ถ้ามีสิทธิ์เข้าถึง
 */
export const hasWardAccess = (user: User | null, ward: Ward): boolean => {
  if (!user) return false;
  
  // Super admin และ developer สามารถเข้าถึงทุก ward
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER) {
    return true;
  }
  
  // Admin สามารถเข้าถึงทุก ward
  if (user.role === UserRole.ADMIN) {
    return true;
  }
  
  // User และ Nurse ต้องตรวจสอบ ward assignment
  if (user.approveWardIds && user.approveWardIds.length > 0) {
    return user.approveWardIds.includes(ward.id || '');
  }
  
  return false;
};

/**
 * กรองข้อมูล Ward ตามสิทธิ์ของผู้ใช้
 * @param wards รายการ Ward ทั้งหมด
 * @param user ผู้ใช้
 * @returns รายการ Ward ที่ผู้ใช้มีสิทธิ์เข้าถึง
 */
export const filterWardsByUserAccess = (wards: Ward[], user: User | null): Ward[] => {
  if (!user) return [];
  
  return wards.filter(ward => hasWardAccess(user, ward));
};

/**
 * คำนวณสถิติรวมจากข้อมูล Ward Forms
 * @param forms รายการ Ward Forms
 * @returns สถิติรวม
 */
export const calculateTotalStats = (forms: WardForm[]) => {
  const stats = {
    opd24hr: 0,
    oldPatient: 0,
    newPatient: 0,
    admit24hr: 0,
    totalPatients: 0,
    totalAdmissions: 0,
    totalDischarges: 0,
    totalDeaths: 0
  };
  
  forms.forEach(form => {
    if (form.patientCensus) stats.totalPatients += form.patientCensus;
    if (form.newAdmit) stats.totalAdmissions += form.newAdmit;
    if (form.discharge) stats.totalDischarges += form.discharge;
    if (form.dead) stats.totalDeaths += form.dead;
    
    // คำนวณ admit24hr
    const admissions = (form.newAdmit || 0) + (form.transferIn || 0) + (form.referIn || 0);
    stats.admit24hr += admissions;
  });
  
  return stats;
};

/**
 * แปลงข้อมูล Ward Form เป็นรูปแบบสำหรับแสดงผล
 * @param ward Ward ข้อมูล
 * @param morningForm ข้อมูลกะเช้า
 * @param nightForm ข้อมูลกะดึก
 * @returns ข้อมูลสำหรับแสดงผล
 */
export const transformWardDataForDisplay = (
  ward: Ward,
  morningForm: WardForm | null,
  nightForm: WardForm | null
) => {
  const morningShift = morningForm ? {
    patientCensus: morningForm.patientCensus || 0,
    nurseManager: morningForm.nurseManager || 0,
    rn: morningForm.rn || 0,
    pn: morningForm.pn || 0,
    wc: morningForm.wc || 0,
    newAdmit: morningForm.newAdmit || 0,
    transferIn: morningForm.transferIn || 0,
    referIn: morningForm.referIn || 0,
    discharge: morningForm.discharge || 0,
    transferOut: morningForm.transferOut || 0,
    referOut: morningForm.referOut || 0,
    dead: morningForm.dead || 0,
    available: morningForm.available || 0,
    unavailable: morningForm.unavailable || 0,
    plannedDischarge: morningForm.plannedDischarge || 0
  } : undefined;
  
  const nightShift = nightForm ? {
    patientCensus: nightForm.patientCensus || 0,
    nurseManager: nightForm.nurseManager || 0,
    rn: nightForm.rn || 0,
    pn: nightForm.pn || 0,
    wc: nightForm.wc || 0,
    newAdmit: nightForm.newAdmit || 0,
    transferIn: nightForm.transferIn || 0,
    referIn: nightForm.referIn || 0,
    discharge: nightForm.discharge || 0,
    transferOut: nightForm.transferOut || 0,
    referOut: nightForm.referOut || 0,
    dead: nightForm.dead || 0,
    available: nightForm.available || 0,
    unavailable: nightForm.unavailable || 0,
    plannedDischarge: nightForm.plannedDischarge || 0
  } : undefined;
  
  return {
    id: ward.id!,
    wardName: ward.wardName,
    morningShift,
    nightShift,
    totalData: {
      patientCensus: morningShift?.patientCensus || nightShift?.patientCensus || 0,
      nurseManager: (morningShift?.nurseManager || 0) + (nightShift?.nurseManager || 0),
      rn: (morningShift?.rn || 0) + (nightShift?.rn || 0),
      pn: (morningShift?.pn || 0) + (nightShift?.pn || 0),
      wc: (morningShift?.wc || 0) + (nightShift?.wc || 0),
      newAdmit: (morningShift?.newAdmit || 0) + (nightShift?.newAdmit || 0),
      transferIn: (morningShift?.transferIn || 0) + (nightShift?.transferIn || 0),
      referIn: (morningShift?.referIn || 0) + (nightShift?.referIn || 0),
      discharge: (morningShift?.discharge || 0) + (nightShift?.discharge || 0),
      transferOut: (morningShift?.transferOut || 0) + (nightShift?.transferOut || 0),
      referOut: (morningShift?.referOut || 0) + (nightShift?.referOut || 0),
      dead: (morningShift?.dead || 0) + (nightShift?.dead || 0),
      available: (morningShift?.available || 0) + (nightShift?.available || 0),
      unavailable: (morningShift?.unavailable || 0) + (nightShift?.unavailable || 0),
      plannedDischarge: (morningShift?.plannedDischarge || 0) + (nightShift?.plannedDischarge || 0)
    }
  };
};

/**
 * ตรวจสอบความถูกต้องของวันที่
 * @param dateString วันที่ในรูปแบบ string
 * @returns true ถ้าวันที่ถูกต้อง
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * สร้าง error message ที่เป็นมิตรกับผู้ใช้
 * @param error Error object
 * @returns ข้อความแสดงข้อผิดพลาดภาษาไทย
 */
export const createUserFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  
  // Firebase offline errors
  if (error.code === 'unavailable' || error.message?.includes('offline')) {
    return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  }
  
  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง';
  }
  
  // Permission errors
  if (error.code === 'permission-denied') {
    return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
  }
  
  // Validation errors
  if (error.message?.includes('validation')) {
    return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่';
  }
  
  // Generic error
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่กรุณาติดต่อผู้ดูแลระบบ';
}; 