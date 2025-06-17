'use client';

import { Ward, WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { format } from 'date-fns';
import { WardSummaryDataWithShifts, WardFormSummary } from '../components/types';
import { getDailySummary, getWardFormsByDateAndWard } from '../services';
import { Logger } from '@/app/lib/utils/logger';

interface TotalStats {
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
}

/**
 * แปลงข้อมูลจาก WardForm หรือ DailySummary เป็น WardFormSummary
 */
const mapToWardFormSummary = (data: any): WardFormSummary | undefined => {
  if (!data) return undefined;
  
  return {
    patientCensus: data.patientCensus || 0,
    admitted: data.admitted || 0,
    discharged: data.discharged || 0,
    transferredIn: data.transferredIn || 0,
    transferredOut: data.transferredOut || 0,
    deaths: data.deaths || 0,
    availableBeds: data.availableBeds || 0,
    occupiedBeds: data.occupiedBeds || 0,
  };
};

/**
 * สร้างข้อมูลสำหรับตาราง Dashboard
 */
export const createTableDataFromWards = async (
  wards: Ward[],
  selectedDate: string,
  user: User | null
): Promise<WardSummaryDataWithShifts[]> => {
  if (!user || wards.length === 0) {
    Logger.info('[createTableDataFromWards] No user or wards available');
    return [];
  }
  
  try {
    Logger.info('[createTableDataFromWards] Creating table data...');
    
    // สร้างข้อมูลสำหรับตาราง
    const results = await Promise.all(
      wards.filter(ward => ward.id).map(async ward => {
        try {
          // ดึงข้อมูลจาก wardForms
          const wardForms = await getWardFormsByDateAndWard(new Date(selectedDate), ward.id!);
          const morning = wardForms.find(f => f.shift === ShiftType.MORNING);
          const night = wardForms.find(f => f.shift === ShiftType.NIGHT);
          
          // ข้อมูลจาก dailySummaries (เป็น fallback)
          const summaryResult = await getDailySummary(ward.id!, selectedDate);
          
          const morningData = morning || summaryResult.morning;
          const morningShift = mapToWardFormSummary(morningData);
          
          const nightData = night || summaryResult.night;
          const nightShift = mapToWardFormSummary(nightData);
          
          return {
            id: ward.id!,
            wardName: ward.name,
            morningShift,
            nightShift,
            totalData: {
              patientCensus: nightShift?.patientCensus || morningShift?.patientCensus || 0,
              admitted: (morningShift?.admitted || 0) + (nightShift?.admitted || 0),
              discharged: (morningShift?.discharged || 0) + (nightShift?.discharged || 0),
              transferredIn: (morningShift?.transferredIn || 0) + (nightShift?.transferredIn || 0),
              transferredOut: (morningShift?.transferredOut || 0) + (nightShift?.transferredOut || 0),
              deaths: (morningShift?.deaths || 0) + (nightShift?.deaths || 0),
              availableBeds: nightShift?.availableBeds || morningShift?.availableBeds || 0, // Use latest
              occupiedBeds: nightShift?.occupiedBeds || morningShift?.occupiedBeds || 0, // Use latest
            }
          };
        } catch (error) {
          Logger.error(`[createTableDataFromWards] Error processing ward ${ward.id}:`, error);
          return {
            id: ward.id!,
            wardName: ward.name,
            morningShift: undefined,
            nightShift: undefined,
            totalData: {
              patientCensus: 0,
              admitted: 0,
              discharged: 0,
              transferredIn: 0,
              transferredOut: 0,
              deaths: 0,
              availableBeds: 0,
              occupiedBeds: 0,
            }
          };
        }
      })
    );
    
    Logger.info(`[createTableDataFromWards] Created table data for ${results.length} wards`);
    return results;
    
  } catch (error) {
    Logger.error('[createTableDataFromWards] Error creating table data:', error);
    return [];
  }
};

/**
 * คำนวณสถิติรวมสำหรับ Dashboard
 */
export const calculateDashboardStats = (summaryData: WardSummaryDataWithShifts[]): TotalStats => {
  const stats: TotalStats = {
    opd24hr: 0,
    oldPatient: 0,
    newPatient: 0,
    admit24hr: 0
  };
  
  summaryData.forEach(wardData => {
    // รวมข้อมูลจากทั้งกะเช้าและกะดึก
    if (wardData.morningShift) {
      stats.admit24hr += (wardData.morningShift.admitted || 0) + 
                       (wardData.morningShift.transferredIn || 0);
    }
    
    if (wardData.nightShift) {
      stats.admit24hr += (wardData.nightShift.admitted || 0) + 
                       (wardData.nightShift.transferredIn || 0);
    }
  });
  
  return stats;
};

/**
 * ประมวลผลข้อมูลสำหรับ Pie Chart
 */
export const processBedCensusDataForChart = (
  wardCensusMap: Map<string, number>,
  wards: Ward[]
): Array<{name: string, value: number, color: string}> => {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
    '#8dd1e1', '#d084d0', '#87d068', '#ffc0cb'
  ];
  
  const chartData: Array<{name: string, value: number, color: string}> = [];
  let colorIndex = 0;
  
  wards.forEach(ward => {
    if (ward.id && wardCensusMap.has(ward.id)) {
      const census = wardCensusMap.get(ward.id) || 0;
      if (census > 0) {
        chartData.push({
          name: ward.name,
          value: census,
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      }
    }
  });
  
  return chartData;
};

/**
 * กรองข้อมูล Ward ตามสิทธิ์ของผู้ใช้
 */
export const filterAccessibleWards = (wards: Ward[], user: User | null): Ward[] => {
  if (!user) return [];
  
  // Super admin, admin, และ developer สามารถเข้าถึงทุก ward
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN || user.role === UserRole.DEVELOPER) {
    return wards;
  }
  
    // User และ Nurse ต้องตรวจสอบ ward assignment
  if (user.approveWardIds && user.approveWardIds.length > 0) {
    return wards.filter(ward =>
      ward.id && user.approveWardIds?.includes(ward.id)
    );
  }
  
  return [];
};

/**
 * ตรวจสอบและปรับปรุงข้อมูลวันที่
 */
export const validateAndFormatDate = (dateString: string): { isValid: boolean, formatted: string } => {
  if (!dateString) {
    return { isValid: false, formatted: '' };
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { isValid: false, formatted: '' };
    }
    
    return { 
      isValid: true, 
      formatted: format(date, 'yyyy-MM-dd') 
    };
  } catch (error) {
    Logger.error('[validateAndFormatDate] Error validating date:', error);
    return { isValid: false, formatted: '' };
  }
};

/**
 * สร้าง error message ที่เหมาะสม
 */
export const createDashboardErrorMessage = (error: any, context: string): string => {
  Logger.error(`[${context}] Dashboard error:`, error);
  
  // ตรวจสอบประเภทของ error
  if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
    return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  }
  
  if (error?.code === 'permission-denied') {
    return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
  }
  
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง';
  }
  
  return 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
};

/**
 * ตรวจสอบสถานะการโหลดข้อมูล
 */
export const shouldShowLoading = (
  loadingStates: { [key: string]: boolean }
): boolean => {
  return Object.values(loadingStates).some(loading => loading);
};

/**
 * รวมข้อมูลจากหลายแหล่ง
 */
export const mergeDataSources = (
  wardFormsData: any,
  summaryData: any
): any => {
  // ใช้ข้อมูลจาก wardForms เป็นหลัก และ fallback ไปที่ summary
  return {
    morning: wardFormsData.morning || summaryData.morning,
    night: wardFormsData.night || summaryData.night
  };
}; 