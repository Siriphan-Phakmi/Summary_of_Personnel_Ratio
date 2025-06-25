'use client';

import { Ward, WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { format } from 'date-fns';
import { WardSummaryDataWithShifts, WardFormSummary, ShiftSummaryData } from '../components/types/interface-types';
import { getDailySummary, getWardFormsByDateAndWard } from '../services';
import { Logger } from '@/app/lib/utils/logger';

interface TotalStats {
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
}

/**
 * แปลงข้อมูลจาก WardForm หรือ DailySummary เป็น ShiftSummaryData
 * Returns a default object with zeros if data is not available.
 */
const mapToShiftSummaryData = (data: any): ShiftSummaryData => {
  if (!data) return {
    patientCensus: 0,
    admitted: 0,
    discharged: 0,
    transferredIn: 0,
    transferredOut: 0,
    deaths: 0,
  };
  
  return {
    patientCensus: data.patientCensus || 0,
    admitted: data.admitted || 0,
    discharged: data.discharged || 0,
    transferredIn: data.transferredIn || 0,
    transferredOut: data.transferredOut || 0,
    deaths: data.deaths || 0,
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
          const morningShiftData = mapToShiftSummaryData(morningData);
          
          const nightData = night || summaryResult.night;
          const nightShiftData = mapToShiftSummaryData(nightData);
          
          return {
            wardId: ward.id!,
            wardName: ward.name,
            morningShiftData,
            nightShiftData,
            totalData: {
              patientCensus: nightShiftData.patientCensus || morningShiftData.patientCensus || 0,
              admitted: (morningShiftData.admitted || 0) + (nightShiftData.admitted || 0),
              discharged: (morningShiftData.discharged || 0) + (nightShiftData.discharged || 0),
              transferredIn: (morningShiftData.transferredIn || 0) + (nightShiftData.transferredIn || 0),
              transferredOut: (morningShiftData.transferredOut || 0) + (nightShiftData.transferredOut || 0),
              deaths: (morningShiftData.deaths || 0) + (nightShiftData.deaths || 0),
            }
          };
        } catch (error) {
          Logger.error(`[createTableDataFromWards] Error processing ward ${ward.id}:`, error);
          return {
            wardId: ward.id!,
            wardName: ward.name,
            morningShiftData: { patientCensus: 0, admitted: 0, discharged: 0, transferredIn: 0, transferredOut: 0, deaths: 0 },
            nightShiftData: { patientCensus: 0, admitted: 0, discharged: 0, transferredIn: 0, transferredOut: 0, deaths: 0 },
            totalData: {
              patientCensus: 0,
              admitted: 0,
              discharged: 0,
              transferredIn: 0,
              transferredOut: 0,
              deaths: 0,
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
    if (wardData.morningShiftData) {
      stats.admit24hr += (wardData.morningShiftData.admitted || 0) + 
                       (wardData.morningShiftData.transferredIn || 0);
    }
    
    if (wardData.nightShiftData) {
      stats.admit24hr += (wardData.nightShiftData.admitted || 0) + 
                       (wardData.nightShiftData.transferredIn || 0);
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
  
  // Admin and developer can access all wards
  if (user.role === UserRole.ADMIN || user.role === UserRole.DEVELOPER) {
    return wards;
  }
  
  // Approver can access their assigned wards for approval
  if (user.role === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
    return wards.filter(ward =>
      ward.id && user.approveWardIds?.includes(ward.id)
    );
  }

  // Nurse can access their assigned ward(s)
  if (user.role === UserRole.NURSE && user.assignedWardId) {
    const assigned = Array.isArray(user.assignedWardId) ? user.assignedWardId : [user.assignedWardId];
    return wards.filter(ward =>
      ward.id && assigned.includes(ward.id)
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