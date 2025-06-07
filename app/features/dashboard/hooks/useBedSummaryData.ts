import { useState, useCallback, useEffect } from 'react';
import { Ward } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { format } from 'date-fns';
import { PieChartDataItem } from '../components/EnhancedPieChart';
import { getWardFormsByDateAndWard, getDailySummary } from '../services';
import { logInfo, logError } from '../utils';

/**
 * Custom hook สำหรับจัดการข้อมูลสรุปเตียง
 * 
 * @param wards รายการ ward ทั้งหมด
 * @param selectedDate วันที่เลือก
 * @param selectedWardId รหัส ward ที่เลือก
 * @param user ข้อมูลผู้ใช้
 * @returns ข้อมูลและฟังก์ชันที่เกี่ยวข้องกับข้อมูลสรุปเตียง
 */
export const useBedSummaryData = (
  wards: Ward[],
  selectedDate: string,
  selectedWardId: string | null,
  user: User | null
) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]);

  /**
   * ฟังก์ชันคำนวณจำนวนเตียงรวมตามช่วงวันที่
   */
  const calculateBedSummary = useCallback(async () => {
    logInfo("[calculateBedSummary] Starting bed summary calculation...");
    
    // ตั้งค่า loading หลังจาก 300ms เพื่อป้องกันการกระพริบของ UI
    const loadingTimer = setTimeout(() => setLoading(true), 300);
    
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
      
      // อัพเดท pieChartData
      setPieChartData(filteredResults);
      
      return filteredResults;
    } catch (error) {
      logError('[calculateBedSummary] Error calculating bed summary:', error);
      // กรณีมีข้อผิดพลาด ให้ล้างข้อมูลเพื่อแสดงข้อความไม่มีข้อมูล
      setPieChartData([]);
      return [];
    } finally {
      // ยกเลิก timer หากยังไม่ได้ทำงาน
      clearTimeout(loadingTimer);
      // ปิด loading หลังจากเสร็จสิ้น
      setLoading(false);
    }
  }, [selectedDate, wards]);

  // เรียกใช้ calculateBedSummary เมื่อ dependencies เปลี่ยนแปลง
  useEffect(() => {
    if (user && wards.length > 0) {
      logInfo("[useBedSummaryData] Auto-calling calculateBedSummary due to dependency changes");
      (async () => {
        try {
          setLoading(true);
          await calculateBedSummary();
        } catch (error) {
          logError("[useBedSummaryData] Error in auto-calculateBedSummary:", error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [calculateBedSummary, selectedDate, selectedWardId, user, wards]);

  return {
    loading,
    pieChartData,
    calculateBedSummary
  };
};

export default useBedSummaryData; 