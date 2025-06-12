'use client';

import { Ward, WardForm } from '@/app/core/types/ward';
import { User, UserRole } from '@/app/core/types/user';
import { format } from 'date-fns';
import { WardSummaryDataWithShifts, WardFormSummary } from '../components/types';
import { getDailySummary, getWardFormsByDateAndWard } from '../services';
import { Logger } from '@/app/core/utils/logger';

interface TotalStats {
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
}

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
          const { morning, night } = await getWardFormsByDateAndWard(ward.id!, selectedDate);
          
          // ข้อมูลจาก dailySummaries
          const summaryResult = await getDailySummary(ward.id!, selectedDate);
          
          const morningData = morning || summaryResult.morning;
          const morningShift: WardFormSummary | undefined = morning ? {
            patientCensus: morning.patientCensus || 0,
            nurseManager: morning.nurseManager || 0,
            rn: morning.rn || 0,
            pn: morning.pn || 0,
            wc: morning.wc || 0,
            newAdmit: morning.newAdmit || 0,
            transferIn: morning.transferIn || 0,
            referIn: morning.referIn || 0,
            discharge: morning.discharge || 0,
            transferOut: morning.transferOut || 0,
            referOut: morning.referOut || 0,
            dead: morning.dead || 0,
            available: morning.available || 0,
            unavailable: morning.unavailable || 0,
            plannedDischarge: morning.plannedDischarge || 0
          } : undefined;
          
          const nightData = night || summaryResult.night;
          const nightShift: WardFormSummary | undefined = night ? {
            patientCensus: night.patientCensus || 0,
            nurseManager: night.nurseManager || 0,
            rn: night.rn || 0,
            pn: night.pn || 0,
            wc: night.wc || 0,
            newAdmit: night.newAdmit || 0,
            transferIn: night.transferIn || 0,
            referIn: night.referIn || 0,
            discharge: night.discharge || 0,
            transferOut: night.transferOut || 0,
            referOut: night.referOut || 0,
            dead: night.dead || 0,
            available: night.available || 0,
            unavailable: night.unavailable || 0,
            plannedDischarge: night.plannedDischarge || 0
          } : undefined;
          
          return {
            id: ward.id!,
            wardName: ward.wardName,
            morningShift,
            nightShift,
            totalData: {
              patientCensus: morningShift?.patientCensus || nightShift?.patientCensus || 0,
              nurseManager: morningShift?.nurseManager || nightShift?.nurseManager || 0,
              rn: morningShift?.rn || nightShift?.rn || 0,
              pn: morningShift?.pn || nightShift?.pn || 0,
              wc: morningShift?.wc || nightShift?.wc || 0,
              newAdmit: morningShift?.newAdmit || nightShift?.newAdmit || 0,
              transferIn: morningShift?.transferIn || nightShift?.transferIn || 0,
              referIn: morningShift?.referIn || nightShift?.referIn || 0,
              discharge: morningShift?.discharge || nightShift?.discharge || 0,
              transferOut: morningShift?.transferOut || nightShift?.transferOut || 0,
              referOut: morningShift?.referOut || nightShift?.referOut || 0,
              dead: morningShift?.dead || nightShift?.dead || 0,
              available: morningShift?.available || nightShift?.available || 0,
              unavailable: morningShift?.unavailable || nightShift?.unavailable || 0,
              plannedDischarge: morningShift?.plannedDischarge || nightShift?.plannedDischarge || 0
            }
          };
        } catch (error) {
          Logger.error(`[createTableDataFromWards] Error processing ward ${ward.id}:`, error);
          return {
            id: ward.id!,
            wardName: ward.wardName,
            morningShift: undefined,
            nightShift: undefined,
            totalData: {
              patientCensus: 0,
              nurseManager: 0,
              rn: 0,
              pn: 0,
              wc: 0,
              newAdmit: 0,
              transferIn: 0,
              referIn: 0,
              discharge: 0,
              transferOut: 0,
              referOut: 0,
              dead: 0,
              available: 0,
              unavailable: 0,
              plannedDischarge: 0
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
      stats.admit24hr += (wardData.morningShift.newAdmit || 0) + 
                       (wardData.morningShift.transferIn || 0) + 
                       (wardData.morningShift.referIn || 0);
    }
    
    if (wardData.nightShift) {
      stats.admit24hr += (wardData.nightShift.newAdmit || 0) + 
                       (wardData.nightShift.transferIn || 0) + 
                       (wardData.nightShift.referIn || 0);
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
          name: ward.wardName,
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