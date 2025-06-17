'use client';

import { Ward, WardForm } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { fetchAllWardCensus as fetchAllWardCensusFromWardForm } from '@/app/features/ward-form/services/wardFormService';
import { Logger } from '@/app/lib/utils/logger';

/**
 * ดึงข้อมูล Census ของทุก Ward สำหรับ Dashboard
 * @param selectedDate วันที่เลือก
 * @returns Map ของจำนวนผู้ป่วยแยกตามแผนก
 */
export const fetchAllWardCensusForDashboard = async (selectedDate: string): Promise<Map<string, number>> => {
  try {
    Logger.info(`[fetchAllWardCensusForDashboard] Fetching census data for date: ${selectedDate}`);
    
    // ใช้ function จาก ward-form service ที่มี offline handling แล้ว
    // ฟังก์ชันนี้ไม่ต้องการพารามิเตอร์ และจะ trả về ข้อมูลล่าสุดเสมอ
    const censusData = await fetchAllWardCensusFromWardForm();
    
    // แปลง array of objects เป็น Map
    const censusMap = new Map<string, number>();
    censusData.forEach(item => {
      if (item && item.wardId && typeof item.patientCensus === 'number') {
        censusMap.set(item.wardId, item.patientCensus);
      }
    });

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
    if (form.admitted) stats.totalAdmissions += form.admitted;
    if (form.discharged) stats.totalDischarges += form.discharged;
    if (form.deaths) stats.totalDeaths += form.deaths;
    
    // คำนวณ admit24hr
    const admissions = (form.admitted || 0) + (form.transferredIn || 0);
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
    ...morningForm
  } : undefined;
  
  const nightShift = nightForm ? {
    ...nightForm
  } : undefined;
  
  return {
    id: ward.id!,
    wardName: ward.name,
    morningShift,
    nightShift,
    totalData: {
      patientCensus: morningShift?.patientCensus || nightShift?.patientCensus || 0,
      admitted: (morningShift?.admitted || 0) + (nightShift?.admitted || 0),
      discharged: (morningShift?.discharged || 0) + (nightShift?.discharged || 0),
      transferredIn: (morningShift?.transferredIn || 0) + (nightShift?.transferredIn || 0),
      transferredOut: (morningShift?.transferredOut || 0) + (nightShift?.transferredOut || 0),
      deaths: (morningShift?.deaths || 0) + (nightShift?.deaths || 0),
      totalBeds: morningShift?.totalBeds || nightShift?.totalBeds || 0,
      occupiedBeds: morningShift?.occupiedBeds || nightShift?.occupiedBeds || 0,
      availableBeds: morningShift?.availableBeds || nightShift?.availableBeds || 0,
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