'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Ward, WardForm } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { 
  fetchAllWardCensus, 
  fetchTotalStats,
  fetchAllWardSummaryData
} from '../services';
import { WardSummaryData, WardSummaryDataWithShifts, WardFormSummary } from '../components/types';
import { getDailySummary, getWardFormsByDateAndWard } from '../services';
import { Logger } from '@/app/lib/utils/logger';
// Import helper functions
import {
  createTableDataFromWards,
  calculateDashboardStats,
  processBedCensusDataForChart,
  filterAccessibleWards,
  validateAndFormatDate,
  createDashboardErrorMessage
} from './useDashboardDataHelpers';

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
        setError(createDashboardErrorMessage(err, 'fetchCensusData'));
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
        setError(createDashboardErrorMessage(err, 'fetchSummaryData'));
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
      const results = await createTableDataFromWards(wards, selectedDate, user);
      
      // เพิ่ม Grand Total
      const grandTotal: WardSummaryDataWithShifts = {
        id: 'GRAND_TOTAL',
        wardName: 'Total All',
        morningShift: undefined, // Grand total doesn't have shift-specific data
        nightShift: undefined,
        totalData: results.reduce((acc, ward) => {
          (Object.keys(acc) as Array<keyof WardFormSummary>).forEach(key => {
            acc[key] = (acc[key] || 0) + (ward.totalData[key] || 0);
          });
          return acc;
        }, {
          patientCensus: 0,
          admitted: 0,
          discharged: 0,
          transferredIn: 0,
          transferredOut: 0,
          deaths: 0,
          availableBeds: 0,
          occupiedBeds: 0,
        } as WardFormSummary)
      };
      
      setTableData([...results, grandTotal]);
    } catch (error) {
      Logger.error('[createTableData] Unexpected error:', error);
      setTableData([]);
      setError(createDashboardErrorMessage(error, 'createTableData'));
    }
  }, [selectedDate, summaryDataList, user, wards]);

  // เรียกใช้ createTableData เมื่อ summaryDataList หรือ selectedDate เปลี่ยนแปลง
  useEffect(() => {
    createTableData();
  }, [createTableData, summaryDataList, selectedDate]);

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลทั้งหมด
  const refreshData = useCallback(async (selectedWardId?: string | null) => {
    setLoading(true);
    setError(null);
    
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
      setError(createDashboardErrorMessage(error, 'refreshData'));
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