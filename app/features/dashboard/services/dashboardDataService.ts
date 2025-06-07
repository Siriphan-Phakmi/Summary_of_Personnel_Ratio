import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { User } from '@/app/core/types/user';
import { Ward } from '@/app/core/types/ward';
import { DashboardSummary, WardFormData } from '../components/types/interface-types';
import { getWardFormsByDateAndWard, getDailySummary } from './index';
import { fetchTotalStats, fetchAllWardCensus, fetchPatientTrends } from './index';
import { logInfo, logError } from '../utils';

/**
 * ดึงข้อมูลแบบฟอร์มสำหรับ ward ที่เลือกและวันที่เลือก
 * 
 * @param wardId รหัส ward ที่เลือก
 * @param date วันที่เลือก
 * @param user ข้อมูลผู้ใช้
 * @param useDailySummaries ใช้ข้อมูลจาก dailySummaries หรือไม่
 * @returns ข้อมูลสรุปสำหรับ Dashboard
 */
export const fetchWardForms = async (
  wardId: string | null,
  date: string,
  user: User | null,
  useDailySummaries: boolean = true
): Promise<DashboardSummary | null> => {
  if (!wardId || !date || !user) {
    return null;
  }
  
  try {
    logInfo(`[fetchWardForms] Selected Ward ID:`, wardId);
    logInfo(`[fetchWardForms] Selected Date:`, date);
    logInfo(`[fetchWardForms] Using dailySummaries:`, useDailySummaries);
    
    let morning: WardFormData | null = null;
    let night: WardFormData | null = null;
    
    if (useDailySummaries) {
      // ลองดึงข้อมูลจาก dailySummaries ก่อน
      const summaryResult = await getDailySummary(wardId, date);
      morning = summaryResult.morning;
      night = summaryResult.night;
      
      // ถ้าไม่พบข้อมูลใน dailySummaries ให้ลองดึงจาก wardForms
      if (!morning && !night) {
        logInfo('[fetchWardForms] No data found in dailySummaries. Falling back to wardForms...');
        const formsResult = await getWardFormsByDateAndWard(wardId, date);
        morning = formsResult.morning;
        night = formsResult.night;
      }
    } else {
      // ดึงข้อมูลจากแบบฟอร์มโดยตรง
      const { morning: morningForm, night: nightForm } = await getWardFormsByDateAndWard(wardId, date);
      morning = morningForm;
      night = nightForm;
    }
    
    if (morning || night) {
      // หา wardName จาก wardId - ถ้าจำเป็นต้องส่ง ward มาเป็น parameter เพิ่มเติม
      const wardName = wardId; // ในกรณีที่ไม่มี ward ส่งมา
      
      // สร้างข้อมูลสรุปสำหรับแสดงผล
      const dashboardSummary: DashboardSummary = {
        wardId: wardId,
        wardName: wardName,
        date: new Date(date),
        dateString: date,
        morningForm: morning || undefined,
        nightForm: night || undefined,
        dailyPatientCensus: night?.patientCensus || morning?.patientCensus || 0
      };
      
      logInfo('[fetchWardForms] Summary created:', dashboardSummary);
      return dashboardSummary;
    } else {
      logInfo('[fetchWardForms] No data found for selected criteria.');
      return null;
    }
  } catch (err) {
    logError('[fetchWardForms] Error fetching data:', err);
    throw err;
  }
};

/**
 * รีเฟรชข้อมูลทั้งหมดสำหรับ Dashboard
 * 
 * @param dateRange ช่วงวันที่
 * @param effectiveDateRange ช่วงวันที่ที่มีผล
 * @param selectedDate วันที่เลือก
 * @param selectedWardId รหัส ward ที่เลือก
 * @param user ข้อมูลผู้ใช้
 * @param wards รายการ ward ทั้งหมด
 * @param callbacks callbacks สำหรับอัพเดทข้อมูล
 * @returns Promise void
 */
export const refreshData = async (
  dateRange: string,
  effectiveDateRange: { start: Date, end: Date },
  selectedDate: string,
  selectedWardId: string | null,
  user: User | null,
  wards: Ward[],
  callbacks: {
    setWardSummaryData: (data: any) => void,
    setTotalStats: (data: any) => void,
    setWardCensusMap: (data: any) => void,
    setTrendData: (data: any) => void,
    setSummary: (data: any) => void
  }
): Promise<void> => {
  try {
    if (!user || wards.length === 0) return;

    const fetchAllTime = dateRange === 'all';
    const currentEndDate = fetchAllTime ? new Date() : effectiveDateRange.end;
    const currentStartDate = fetchAllTime ? parseISO('1970-01-01') : effectiveDateRange.start;

    const dateToQueryStats = format(currentEndDate, 'yyyy-MM-dd');
    const startDateForSummary = format(currentStartDate, 'yyyy-MM-dd');
    const endDateForSummary = format(currentEndDate, 'yyyy-MM-dd');

    logInfo(`[refreshData] Refreshing data for dateRange=${dateRange}, start=${startDateForSummary}, end=${endDateForSummary}`);

    // เรียกใช้ฟังก์ชันดึงข้อมูลต่างๆ พร้อมกัน
    const [summaryData, stats, censusMap, trends] = await Promise.all([
      // ดึงข้อมูลสรุปทั้งหมด
      fetchAllWardSummaryData(startDateForSummary, endDateForSummary, wards, fetchAllTime, user),
      
      // ดึงข้อมูลสถิติทั้งหมด
      fetchTotalStats(startDateForSummary, endDateForSummary, user, selectedWardId || undefined),
      
      // ดึงข้อมูล Census
      fetchAllWardCensus(dateToQueryStats),
      
      // ดึงข้อมูลแนวโน้ม
      fetchPatientTrends(currentStartDate, currentEndDate, selectedWardId ?? undefined, fetchAllTime, user, wards)
    ]);
    
    // อัพเดทข้อมูลต่างๆ
    callbacks.setWardSummaryData(summaryData);
    callbacks.setTotalStats(stats);
    callbacks.setWardCensusMap(censusMap);
    callbacks.setTrendData(trends);
    
    // ดึงข้อมูลแบบฟอร์ม
    if (selectedWardId) {
      // fetchWardForms ควรดึงข้อมูลของ selectedDate (ถ้า dateRange ไม่ใช่ 'all')
      // หรือวันล่าสุดถ้า dateRange เป็น 'all'
      const formDateToQuery = dateRange === 'all' ? format(new Date(), 'yyyy-MM-dd') : selectedDate;
      const summary = await fetchWardForms(selectedWardId, formDateToQuery, user);
      callbacks.setSummary(summary);
    }
    
    logInfo("[refreshData] All data refreshed successfully");
  } catch (error) {
    logError('[refreshData] Error:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปของทุก ward ตามช่วงวันที่
 * 
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @param wards รายการ ward ทั้งหมด
 * @param fetchAllTime ดึงข้อมูลทั้งหมดหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @returns ข้อมูลสรุปของทุก ward
 */
export const fetchAllWardSummaryData = async (
  startDate: string,
  endDate: string,
  wards: Ward[],
  fetchAllTime: boolean,
  user: User | null
): Promise<any> => {
  // ฟังก์ชันนี้ควรถูกย้ายมาจาก DashboardPage.tsx
  // จะต้องทำการเชื่อมต่อกับฟังก์ชันใน services/wardSummaryService.ts
  
  // สำหรับตัวอย่าง return ค่าว่างไว้ก่อน
  return [];
};

export default {
  fetchWardForms,
  refreshData,
  fetchAllWardSummaryData
}; 