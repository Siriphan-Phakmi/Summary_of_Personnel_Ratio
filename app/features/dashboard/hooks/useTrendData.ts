import { useState, useCallback, useMemo } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { User, UserRole } from '@/app/features/auth/types/user';
import { Ward } from '@/app/features/ward-form/types/ward';
import { fetchPatientTrends } from '../services/patientTrendService';
import { logInfo, logError } from '../utils/loggingUtils';

// Set of colors for ward trends
export const wardColors: Record<string, string> = {
  CCU: '#8884d8', ICU: '#82ca9d', LR: '#ffc658', NSY: '#ff7300',
  WARD10B: '#8dd1e1', WARD11: '#d084d0', WARD12: '#ffb347', WARD6: '#67b7dc',
  WARD7: '#a4de6c', WARD8: '#ffc0cb', WARD9: '#87ceeb', WARDGI: '#dda0dd'
};

export const useTrendData = (
  user: User | null, 
  wards: Ward[],
  effectiveDateRange: { start: Date, end: Date }
) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [selectedTrendWards, setSelectedTrendWards] = useState<string[]>([]);
  const [trendDateRange, setTrendDateRange] = useState<{ start: number; end: number }>({ start: 1, end: 31 });
  const [customTrendStart, setCustomTrendStart] = useState<string>('1');
  const [customTrendEnd, setCustomTrendEnd] = useState<string>('31');
  const [loading, setLoading] = useState(false);

  // ตั้งค่า default selectedTrendWards เมื่อโหลด wards
  useMemo(() => {
    if (wards.length > 0) {
      const isRegularUser = user?.role !== UserRole.ADMIN && 
                            user?.role !== UserRole.SUPER_ADMIN && 
                            user?.role !== UserRole.DEVELOPER;
      const defaults = isRegularUser && user?.floor
        ? [user.floor.toUpperCase()]
        : wards.map(w => w.id?.toUpperCase() || '');
      setSelectedTrendWards(defaults);
    }
  }, [wards, user]);

  // ฟังก์ชันสำหรับเพิ่ม/ลบ ward ใน selectedTrendWards
  const toggleTrendWard = useCallback((wardId: string) => {
    setSelectedTrendWards(prev =>
      prev.includes(wardId)
        ? prev.filter(w => w !== wardId)
        : [...prev, wardId]
    );
  }, []);

  // ฟังก์ชันสำหรับตั้งค่าช่วงวันที่อย่างรวดเร็ว
  const setQuickTrendDateRange = useCallback((start: number, end: number) => {
    setTrendDateRange({ start, end });
    setCustomTrendStart(start.toString());
    setCustomTrendEnd(end.toString());
    
    // เพิ่มการโหลดข้อมูล trend ใหม่เมื่อเลือกช่วงวันที่แบบเร็ว
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const startDateObj = startOfDay(new Date(year, month, start));
    const endDateObj = endOfDay(new Date(year, month, end));
    
    // เริ่มโหลดข้อมูลใหม่
    setLoading(true);
    (async () => {
      try {
        const newTrendData = await fetchPatientTrends(
          startDateObj,
          endDateObj,
          undefined,
          false,
          user,
          wards
        );
        setTrendData(newTrendData);
        logInfo(`[QuickTrendDateRange] Successfully loaded trend data for ${format(startDateObj, 'yyyy-MM-dd')} to ${format(endDateObj, 'yyyy-MM-dd')}`);
      } catch (error) {
        logError('[QuickTrendDateRange] Error fetching trend data for chart:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, wards]);

  // ฟังก์ชันสำหรับการใช้ช่วงวันที่ที่กำหนดเอง
  const applyCustomTrendDateRange = useCallback(() => {
    const start = Math.max(1, Math.min(31, parseInt(customTrendStart, 10) || 1));
    const end = Math.max(start, Math.min(31, parseInt(customTrendEnd, 10) || 31));
    setTrendDateRange({ start, end });
    
    // เพิ่มการโหลดข้อมูล trend ใหม่เมื่อกดปุ่ม Apply Range
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const startDateObj = startOfDay(new Date(year, month, start));
    const endDateObj = endOfDay(new Date(year, month, end));
    
    // เริ่มโหลดข้อมูลใหม่
    setLoading(true);
    (async () => {
      try {
        const newTrendData = await fetchPatientTrends(
          startDateObj,
          endDateObj,
          undefined,
          false,
          user,
          wards
        );
        setTrendData(newTrendData);
        logInfo(`[CustomTrendDateRange] Successfully loaded trend data for ${format(startDateObj, 'yyyy-MM-dd')} to ${format(endDateObj, 'yyyy-MM-dd')}`);
      } catch (error) {
        logError('[CustomTrendDateRange] Error fetching trend data for chart:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [customTrendStart, customTrendEnd, user, wards]);

  // เตรียมข้อมูลสำหรับกราฟเส้น trend chart
  const trendChartData = useMemo(() => {
    return trendData.map(item => {
      const row: Record<string, any> = { date: item.date };
      selectedTrendWards.forEach(wardId => {
        row[wardId] = item.wardData?.[wardId]?.patientCount ?? null;
      });
      return row;
    });
  }, [trendData, selectedTrendWards]);

  // กรองข้อมูลตามช่วงวันที่ที่เลือก
  const filteredTrendChartData = useMemo(() => {
    return trendChartData.filter(item => {
      const day = parseInt(item.date.split('/')[0], 10);
      return day >= trendDateRange.start && day <= trendDateRange.end;
    });
  }, [trendChartData, trendDateRange]);

  // ฟังก์ชันสำหรับโหลดข้อมูล trend
  const fetchTrendDataHandler = useCallback(async (
    selectedWardId: string | null = null,
    fetchAllTime: boolean = false
  ) => {
    try {
      setLoading(true);
      
      let effectiveWardId = undefined;
      
      // ถ้ามีการเลือก ward เฉพาะเจาะจง
      if (selectedWardId) {
        effectiveWardId = selectedWardId;
      }
      
      console.log(`[fetchTrendDataHandler] Fetching trend data: effectiveWardId=${effectiveWardId}, fetchAllTime=${fetchAllTime}`);
      
      const trends = await fetchPatientTrends(
          effectiveDateRange.start, 
          effectiveDateRange.end, 
          effectiveWardId,
          fetchAllTime,
          user,
          wards
      );
      
      if (trends.length > 0) {
          console.log(`[fetchTrendDataHandler] Fetched ${trends.length} data points. Sample data:`, trends[0]);
      } else {
          console.log(`[fetchTrendDataHandler] No trend data fetched.`);
      }
      
      setTrendData(trends);
      return trends;
    } catch (err) {
      console.error('[fetchTrendDataHandler] Error fetching trend data:', err);
      setTrendData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [effectiveDateRange, user, wards]);

  return {
    trendData,
    selectedTrendWards,
    trendDateRange,
    customTrendStart,
    customTrendEnd,
    loading,
    toggleTrendWard,
    setQuickTrendDateRange,
    applyCustomTrendDateRange,
    setCustomTrendStart,
    setCustomTrendEnd,
    trendChartData,
    filteredTrendChartData,
    fetchTrendDataHandler,
    setSelectedTrendWards
  };
}; 