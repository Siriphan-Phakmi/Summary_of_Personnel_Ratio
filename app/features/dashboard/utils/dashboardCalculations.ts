import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Ward } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { getDailySummary, getWardFormsByDateAndWard } from '../services';
import { logInfo, logError } from './loggingUtils';
import { PieChartDataItem } from '../components/EnhancedPieChart';

/**
 * คำนวณความสูงที่เหมาะสมสำหรับกราฟแท่ง
 * 
 * @param dataLength จำนวนข้อมูลที่จะแสดงในกราฟ
 * @returns ความสูงที่เหมาะสม (pixels)
 */
export const calculateOptimalChartHeight = (dataLength: number): number => {
  // ความสูงขั้นต่ำ 400px, สูงสุด 720px, แต่ละแถวใช้ 56px
  return Math.max(400, Math.min(720, dataLength * 56));
};

/**
 * คำนวณจำนวนเตียงรวมตามช่วงวันที่
 * 
 * @param selectedDate วันที่เลือก
 * @param wards รายการแผนก
 * @returns ข้อมูลสรุปเตียง
 */
export const calculateBedSummary = async (
  selectedDate: string, 
  wards: Ward[]
): Promise<PieChartDataItem[]> => {
  logInfo("[calculateBedSummary] Starting bed summary calculation...");
  
  try {
    // สร้างชุดข้อมูลสำหรับแต่ละ Ward ทั้งหมด
    const summaryMap = new Map<string, { total: number, available: number, unavailable: number, plannedDischarge: number }>();
    
    // แทนที่จะดึงข้อมูลทีละ ward ให้ดึงข้อมูลทุก ward พร้อมกัน
    const wardPromises = wards
      .filter(ward => ward.id) // กรองเฉพาะ ward ที่มี id
      .map(async (ward) => {
        try {
          if (!ward.id) return null;
          
          // ใช้ selectedDate แทน effectiveDateRange.end
          const currentDateString = selectedDate;
          logInfo(`[calculateBedSummary] Getting data for ward ${ward.id} on date ${currentDateString}`);
          
          // ดึงข้อมูลแบบฟอร์มของ ward ในวันที่เลือก - ดึงทั้ง ward form และ daily summary พร้อมกัน
          const [wardFormResult, dailySummaryResult] = await Promise.all([
            getWardFormsByDateAndWard(ward.id, currentDateString),
            getDailySummary(ward.id, currentDateString)
          ]);
          
          // รวมข้อมูลจาก ward form และ daily summary
          const { morning: wardFormMorning, night: wardFormNight } = wardFormResult;
          const { morning: summaryMorning, night: summaryNight } = dailySummaryResult;
          
          // ใช้ข้อมูลจาก ward form หากมี ถ้าไม่มีให้ใช้จาก daily summary
          const morning = wardFormMorning || summaryMorning;
          const night = wardFormNight || summaryNight;
          
          // ใช้ข้อมูลเวรเช้าเป็นหลัก ถ้าไม่มีให้ใช้เวรดึก
          let availableBeds = 0;
          let unavailableBeds = 0;
          let plannedDischarge = 0;
          let totalBeds = 0;
          
          if (morning) {
            availableBeds = morning.available || 0;
            unavailableBeds = morning.unavailable || 0;
            plannedDischarge = morning.plannedDischarge || 0;
            totalBeds = (morning.available || 0) + (morning.unavailable || 0);
          } else if (night) {
            availableBeds = night.available || 0;
            unavailableBeds = night.unavailable || 0;
            plannedDischarge = night.plannedDischarge || 0;
            totalBeds = (night.available || 0) + (night.unavailable || 0);
          }
          
          // ตรวจสอบความถูกต้องของข้อมูล
          if (availableBeds < 0) availableBeds = 0;
          if (unavailableBeds < 0) unavailableBeds = 0;
          if (plannedDischarge < 0) plannedDischarge = 0;
          
          return {
            id: ward.id,
            wardName: ward.wardName,
            value: availableBeds,
            unavailable: unavailableBeds,
            plannedDischarge: plannedDischarge,
            total: totalBeds
          };
        } catch (error) {
          logError(`[calculateBedSummary] Error processing ward ${ward.id}:`, error);
          // กรณีมีข้อผิดพลาด ให้ส่งข้อมูลว่างเปล่า
          return {
            id: ward.id || 'unknown',
            wardName: ward.wardName || 'Unknown Ward',
            value: 0,
            unavailable: 0,
            plannedDischarge: 0,
            total: 0
          };
        }
      });
    
    // รอให้ทุก ward ทำงานเสร็จพร้อมกัน
    const results = await Promise.all(wardPromises);
    
    // กรองข้อมูลที่เป็น null ออก
    const filteredResults = results.filter(result => result !== null) as PieChartDataItem[];
    
    // ตรวจสอบว่ามีข้อมูลอย่างน้อย 1 รายการหรือไม่
    logInfo(`[calculateBedSummary] Processed ${filteredResults.length} wards with bed data`);
    
    return filteredResults;
  } catch (error) {
    logError('[calculateBedSummary] Error calculating bed summary:', error);
    // กรณีมีข้อผิดพลาด ให้ส่งอาร์เรย์ว่าง
    return [];
  }
};

/**
 * คำนวณจำนวนผู้ป่วยจากข้อมูลแบบฟอร์ม
 * 
 * @param initialCensus จำนวนผู้ป่วยเริ่มต้น
 * @param newAdmit จำนวนรับใหม่
 * @param transferIn จำนวนรับย้าย
 * @param referIn จำนวนรับ refer
 * @param discharge จำนวนจำหน่าย
 * @param transferOut จำนวนส่งย้าย
 * @param referOut จำนวนส่ง refer
 * @param dead จำนวนเสียชีวิต
 * @returns จำนวนผู้ป่วยที่คำนวณได้
 */
export const calculatePatientCensus = (
  initialCensus: number,
  newAdmit: number,
  transferIn: number,
  referIn: number,
  discharge: number,
  transferOut: number,
  referOut: number,
  dead: number
): number => {
  // Validate inputs - ensure all values are valid numbers and not negative
  const validateInput = (value: number, defaultValue: number = 0): number => {
    // Check if value is undefined, null, NaN, or negative
    if (value === undefined || value === null || isNaN(value) || value < 0) {
      return defaultValue;
    }
    return value;
  };
  
  // Validate all inputs
  const validInitialCensus = validateInput(initialCensus);
  const validNewAdmit = validateInput(newAdmit);
  const validTransferIn = validateInput(transferIn);
  const validReferIn = validateInput(referIn);
  const validDischarge = validateInput(discharge);
  const validTransferOut = validateInput(transferOut);
  const validReferOut = validateInput(referOut);
  const validDead = validateInput(dead);
  
  // คำนวณจำนวนผู้ป่วยรวม
  const admitTotal = validNewAdmit + validTransferIn + validReferIn;
  const dischargeTotal = validDischarge + validTransferOut + validReferOut + validDead;
  
  // คำนวณจำนวนผู้ป่วยปัจจุบัน
  const calculatedCensus = validInitialCensus + admitTotal - dischargeTotal;
  
  // Ensure result is not negative
  return Math.max(0, calculatedCensus);
};

/**
 * แปลงข้อมูลสำหรับกราฟแท่ง
 * 
 * @param data ข้อมูลดิบ
 * @returns ข้อมูลที่แปลงแล้ว
 */
export const formatChartData = (data: any[]) => {
  // Validate input
  if (!data || !Array.isArray(data)) {
    logError('[formatChartData] Invalid input: data is not an array');
    return [];
  }
  
  return data.map(item => {
    // Validate item
    if (!item) {
      logError('[formatChartData] Invalid item in data array: undefined or null');
      return {
        name: 'Unknown',
        value: 0,
        morning: 0,
        night: 0
      };
    }
    
    // Ensure item properties are valid
    const name = item.wardName || 'Unknown';
    const value = typeof item.patientCount === 'number' && !isNaN(item.patientCount) 
      ? item.patientCount 
      : 0;
    
    const morning = typeof item.morningPatientCount === 'number' && !isNaN(item.morningPatientCount) 
      ? item.morningPatientCount 
      : 0;
    
    const night = typeof item.nightPatientCount === 'number' && !isNaN(item.nightPatientCount) 
      ? item.nightPatientCount 
      : 0;
    
    return {
      name,
      value,
      morning,
      night
    };
  });
};

/**
 * ตรวจสอบว่ามีข้อมูลในวันที่ระบุหรือไม่
 * 
 * @param date วันที่ต้องการตรวจสอบ
 * @param data ข้อมูลที่มี
 * @returns true ถ้ามีข้อมูลในวันที่ระบุ
 */
export const hasDataForDate = (date: string, data: any[]): boolean => {
  // Validate inputs
  if (!date || typeof date !== 'string' || date.trim() === '') {
    logError('[hasDataForDate] Invalid date input');
    return false;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    logError('[hasDataForDate] Invalid data input: empty or not an array');
    return false;
  }
  
  // Check if any item has the specified date
  return data.some(item => item && item.date === date);
}; 