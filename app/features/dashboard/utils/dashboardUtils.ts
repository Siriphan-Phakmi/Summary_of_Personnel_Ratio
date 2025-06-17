import { Ward } from '@/app/features/ward-form/types/ward';
import { WardCensusData, DailyPatientData } from '../components/types';
import { logInfo, logError } from './loggingUtils';
import { parseISO, format, subDays } from 'date-fns';
import { fetchPatientTrends } from '../services/patientTrendService';
import { User, UserRole } from '@/app/features/auth/types/user';

/**
 * รายชื่อแผนกที่ต้องการให้แสดงใน Dashboard
 */
export const DASHBOARD_WARDS = [
  'CCU', 'ICU', 'LR', 'NSY', 'Ward10B', 'Ward11', 'Ward12',
  'Ward6', 'Ward7', 'Ward8', 'Ward9', 'WardGI'
];

/**
 * ตัวเลือกช่วงเวลา
 */
export const DATE_RANGE_OPTIONS = [
  { label: 'วันนี้', value: 'today' },
  { label: 'กำหนดเอง', value: 'custom' }
];

/**
 * ตรวจสอบว่าผู้ใช้เป็นผู้ใช้ทั่วไปหรือไม่
 * @param user ข้อมูลผู้ใช้
 * @returns true ถ้าเป็นผู้ใช้ทั่วไป, false ถ้าเป็น admin
 */
export const isRegularUser = (user: User | null): boolean => {
  return user?.role !== UserRole.ADMIN && 
         user?.role !== UserRole.SUPER_ADMIN && 
         user?.role !== UserRole.DEVELOPER;
};

/**
 * ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
 * @param user ข้อมูลผู้ใช้
 * @returns true ถ้าเป็น admin, false ถ้าไม่ใช่
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN || 
         user?.role === UserRole.SUPER_ADMIN || 
         user?.role === UserRole.DEVELOPER;
};

/**
 * ฟังก์ชันดึงข้อมูลผู้ป่วยรายวัน
 * @param dateRangeForDailyChart ช่วงวันที่สำหรับข้อมูลรายวัน
 * @param customStartDate วันเริ่มต้นที่กำหนดเอง
 * @param customEndDate วันสิ้นสุดที่กำหนดเอง
 * @param selectedWardId รหัสแผนกที่เลือก
 * @param user ข้อมูลผู้ใช้
 * @param wards ข้อมูลแผนกทั้งหมด
 * @returns ข้อมูลผู้ป่วยรายวัน
 */
export const fetchDailyPatientDataWrapper = async (
  dateRangeForDailyChart: string,
  customStartDate: string,
  customEndDate: string,
  selectedWardId: string | null,
  user: User | null,
  wards: Ward[]
): Promise<DailyPatientData[]> => {
  try {
    // กำหนดช่วงวันที่ตามที่เลือก
    let startDateStr: string;
    let endDateStr = format(new Date(), 'yyyy-MM-dd');
    
    switch (dateRangeForDailyChart) {
      case '7days':
        startDateStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        break;
      case '30days':
        startDateStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        break;
      case 'custom':
        startDateStr = customStartDate;
        endDateStr = customEndDate;
        break;
      default:
        startDateStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    }
    
    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);
    
    // กำหนด wardId ตามสิทธิ์การเข้าถึง
    let wardIdToFetch: string | undefined;
    
    if (selectedWardId) {
      // ถ้ามีการเลือก ward ใช้ ward ที่เลือก
      wardIdToFetch = selectedWardId;
    } else if (isRegularUser(user) && user?.floor) {
      // ถ้าเป็น User ทั่วไป ใช้ ward ของตัวเอง
      wardIdToFetch = user.floor;
    }
    
    // ดึงข้อมูลแนวโน้ม
    const trendData = await fetchPatientTrends(
      startDate,
      endDate,
      wardIdToFetch,
      false,
      user,
      wards
    );
    
    // แปลงข้อมูลเป็นรูปแบบที่ใช้กับกราฟ
    const dailyData: DailyPatientData[] = [];
    
    if (wardIdToFetch) {
      // กรณีเลือก ward เดียว
      for (const item of trendData) {
        // หาข้อมูล ward ที่ต้องการ
        const wardData = item.wardData && item.wardData[wardIdToFetch.toUpperCase()];
        
        if (wardData) {
          // แปลงรูปแบบวันที่ DD/MM เป็น YYYY-MM-DD
          const dateParts = item.date.split('/');
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[0]);
          const year = new Date().getFullYear();
          
          dailyData.push({
            date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            displayDate: item.date,
            morningPatientCount: wardData.patientCount,
            nightPatientCount: wardData.patientCount,
            totalPatientCount: wardData.patientCount,
            wardId: wardIdToFetch.toUpperCase(),
            wardName: wardData.wardName
          });
        }
      }
    } else {
      // กรณี admin ดูทุก ward
      for (const item of trendData) {
        // แปลงรูปแบบวันที่ DD/MM เป็น YYYY-MM-DD
        const dateParts = item.date.split('/');
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[0]);
        const year = new Date().getFullYear();
        
        dailyData.push({
          date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
          displayDate: item.date,
          morningPatientCount: item.patientCount / 2,
          nightPatientCount: item.patientCount / 2,
          totalPatientCount: item.patientCount,
          wardId: 'ALL',
          wardName: 'ทุกแผนก'
        });
      }
    }
    
    // เรียงข้อมูลตามวันที่
    dailyData.sort((a, b) => a.date.localeCompare(b.date));
    
    return dailyData;
  } catch (error) {
    logError('[fetchDailyPatientDataWrapper] Error:', error);
    return [];
  }
}; 