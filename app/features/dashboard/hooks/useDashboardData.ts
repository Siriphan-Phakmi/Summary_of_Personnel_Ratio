'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Ward, WardForm } from '@/app/core/types/ward';
import { User } from '@/app/core/types/user';
import { 
  fetchAllWardCensus, 
  fetchTotalStats,
  fetchAllWardSummaryData
} from '../services';
import { WardSummaryData, WardSummaryDataWithShifts, WardFormSummary } from '../components/types';
import { getDailySummary, getWardFormsByDateAndWard } from '../services';
import { Logger } from '@/app/core/utils/logger';

interface TotalStats {
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
}

/**
 * Custom hook สำหรับจัดการข้อมูลหลักของ Dashboard
 */
export const useDashboardData = (
  selectedDate: string, 
  startDate: string, 
  endDate: string,
  dateRange: string,
  user: User | null, 
  wards: Ward[]
) => {
  // State สำหรับเก็บข้อมูลต่างๆ
  const [wardCensusMap, setWardCensusMap] = useState<Map<string, number>>(new Map());
  const [summaryDataList, setWardSummaryData] = useState<WardSummaryDataWithShifts[]>([]);
  const [tableData, setTableData] = useState<WardSummaryDataWithShifts[]>([]);
  const [totalStats, setTotalStats] = useState<TotalStats>({
    opd24hr: 0,
    oldPatient: 0,
    newPatient: 0,
    admit24hr: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูล Census ของทุก Ward
  useEffect(() => {
    if (!selectedDate || !user) {
      return;
    }
    
    const fetchCensusData = async () => {
      setLoading(true);
      try {
        // ดึง census map 
        const censusMap = await fetchAllWardCensus(selectedDate);
        setWardCensusMap(censusMap);
      } catch (err) {
        Logger.error('[useDashboardData] Error fetching ward census data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCensusData();
  }, [selectedDate, user]);

  // ดึงข้อมูลสรุปของทุกแผนก
  useEffect(() => {
    if (!user || wards.length === 0) {
      return;
    }
    
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        const fetchAllTime = dateRange === 'all';
        // หาก fetchAllTime เป็น true, startDate และ endDate จะถูก override ใน fetchAllWardSummaryData
        // หากไม่ใช่ ให้ใช้ effectiveDateRange ปกติ
        const startDateStr = fetchAllTime ? '1970-01-01' : startDate;
        const endDateStr = fetchAllTime ? format(new Date(), 'yyyy-MM-dd') : endDate;
        
        const allAppWards = wards; // wards นี้ควรเป็น state ที่มีข้อมูล ward ทั้งหมดที่ผู้ใช้มีสิทธิ์
        // ส่ง flag fetchAllTime และ user เข้าไป
        const summaryData = await fetchAllWardSummaryData(startDateStr, endDateStr, allAppWards, fetchAllTime, user);
        setWardSummaryData(summaryData);
        
        // totalStats ควรดึงข้อมูลของวันล่าสุดในช่วงที่เลือก หรือวันปัจจุบันถ้าเป็น "แสดงทั้งหมด"
        const statsDate = fetchAllTime ? format(new Date(), 'yyyy-MM-dd') : endDateStr;
        const stats = await fetchTotalStats(statsDate, statsDate, user, undefined); // ส่ง user และ selectedWardId เข้าไป
        setTotalStats(stats);
      } catch (err) {
        Logger.error('[useDashboardData] Error fetching ward summary data:', err);
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, [startDate, endDate, user, wards, dateRange]);

  // แยกฟังก์ชัน createTableData ออกมาเพื่อลดความซับซ้อน
  const createTableData = useCallback(async () => {
    if (!user || wards.length === 0) return;
    
    try {
      Logger.info('[createTableData] Creating table data...');
      
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
            Logger.error(`[createTableData] Error processing ward ${ward.id}:`, error);
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
      
      // เพิ่ม Grand Total
      const grandTotal: WardSummaryDataWithShifts = {
        id: 'GRAND_TOTAL',
        wardName: 'Total All',
        morningShift: (() => {
          const total: WardFormSummary = {
            patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
            newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0,
            transferOut: 0, referOut: 0, dead: 0, available: 0,
            unavailable: 0, plannedDischarge: 0
          };
          results.forEach(ward => {
            if (ward.morningShift) {
              (Object.keys(total) as Array<keyof WardFormSummary>).forEach(key => {
                total[key] += ward.morningShift![key] || 0;
              });
            }
          });
          return total;
        })(),
        nightShift: (() => {
          const total: WardFormSummary = {
            patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
            newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0,
            transferOut: 0, referOut: 0, dead: 0, available: 0,
            unavailable: 0, plannedDischarge: 0
          };
          results.forEach(ward => {
            if (ward.nightShift) {
              (Object.keys(total) as Array<keyof WardFormSummary>).forEach(key => {
                total[key] += ward.nightShift![key] || 0;
              });
            }
          });
          return total;
        })(),
        totalData: (() => {
          const total: WardFormSummary = {
            patientCensus: 0, nurseManager: 0, rn: 0, pn: 0, wc: 0,
            newAdmit: 0, transferIn: 0, referIn: 0, discharge: 0,
            transferOut: 0, referOut: 0, dead: 0, available: 0,
            unavailable: 0, plannedDischarge: 0
          };
          results.forEach(ward => {
            (Object.keys(total) as Array<keyof WardFormSummary>).forEach(key => {
              total[key] += ward.totalData[key] || 0;
            });
          });
          return total;
        })()
      };
      
      setTableData([...results, grandTotal]);
    } catch (error) {
      Logger.error('[createTableData] Unexpected error:', error);
      setTableData([]);
    }
  }, [selectedDate, summaryDataList, user, wards]);

  // เรียกใช้ createTableData เมื่อ summaryDataList หรือ selectedDate เปลี่ยนแปลง
  useEffect(() => {
    createTableData();
  }, [createTableData, summaryDataList, selectedDate]);

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลทั้งหมด
  const refreshData = useCallback(async (selectedWardId?: string | null) => {
    setLoading(true);
    try {
      if (!user || wards.length === 0) return;

      const fetchAllTime = dateRange === 'all';
      const dateToQueryStats = endDate;
      const startDateForSummary = fetchAllTime ? '1970-01-01' : startDate;
      const endDateForSummary = endDate;

      Logger.info(`[refreshData] Refreshing data for dateRange=${dateRange}, start=${startDateForSummary}, end=${endDateForSummary}`);

      // ดึงข้อมูลสรุปทั้งหมด
      // ส่ง flag fetchAllTime เข้าไปใน fetchAllWardSummaryData
      const summaryData = await fetchAllWardSummaryData(startDateForSummary, endDateForSummary, wards, fetchAllTime, user);
      setWardSummaryData(summaryData);
      
      // ดึงข้อมูลสถิติทั้งหมด
      const stats = await fetchTotalStats(startDateForSummary, endDateForSummary, user, selectedWardId || undefined);
      setTotalStats(stats);
      
      // ดึงข้อมูล Census
      const censusMap = await fetchAllWardCensus(dateToQueryStats); // Census ยังคงใช้ dateToQueryStats (วันสุดท้าย)
      setWardCensusMap(censusMap);

      // สร้างข้อมูลตาราง
      await createTableData();
      
      Logger.info("[refreshData] All data refreshed successfully");

    } catch (error) {
      Logger.error('[refreshData] Error:', error);
      setError('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [dateRange, startDate, endDate, user, wards, createTableData]);

  return {
    wardCensusMap,
    summaryDataList,
    tableData,
    totalStats,
    loading,
    error,
    refreshData
  };
};

export default useDashboardData; 