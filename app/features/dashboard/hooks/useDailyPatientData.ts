import { useState, useEffect, useCallback } from 'react';
import { User } from '@/app/features/auth/types/user';
import { Ward } from '@/app/features/ward-form/types/ward';
import { DailyPatientData } from '../components/types';
import { fetchDailyPatientDataWrapper } from '../utils/dashboardUtils';
import { logError } from '../utils/loggingUtils';

export const useDailyPatientData = (
  user: User | null,
  wards: Ward[],
  selectedWardId: string | null
) => {
  const [dailyPatientData, setDailyPatientData] = useState<DailyPatientData[]>([]);
  const [dateRangeForDailyChart, setDateRangeForDailyChart] = useState('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลผู้ป่วยรายวัน
  const fetchDailyData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await fetchDailyPatientDataWrapper(
        dateRangeForDailyChart,
        customStartDate,
        customEndDate,
        selectedWardId,
        user,
        wards
      );
      
      setDailyPatientData(data);
    } catch (error) {
      logError('[useDailyPatientData] Error fetching daily data:', error);
      setDailyPatientData([]);
    } finally {
      setLoading(false);
    }
  }, [customEndDate, customStartDate, dateRangeForDailyChart, selectedWardId, user, wards]);

  // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อตัวแปรที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    if (user) {
      fetchDailyData();
    }
  }, [fetchDailyData, user]);

  return {
    dailyPatientData,
    dateRangeForDailyChart,
    customStartDate,
    customEndDate,
    loading,
    setDateRangeForDailyChart,
    setCustomStartDate,
    setCustomEndDate,
    fetchDailyData
  };
}; 