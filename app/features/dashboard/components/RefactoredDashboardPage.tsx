'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { Ward } from '@/app/core/types/ward';
import { UserRole, User } from '@/app/core/types/user';
import { useTheme } from 'next-themes';

// Import custom hooks
import { 
  useDateRangeEffect, 
  useBedSummaryData, 
  useDashboardData,
  useTrendData,
  useDailyPatientData
} from '../hooks';

// Import services
import {
  getDailySummary,
  getWardById,
  getWardFormsByDateAndWard,
  getWardsByUserPermission,
  fetchAllWardSummaryData,
  fetchCalendarMarkers
} from '../services';

// Import utils
import { 
  logInfo, 
  logError, 
  hasAccessToWard, 
  getThaiDayName, 
  calculateBedSummary,
  isRegularUser,
  isAdmin,
  DATE_RANGE_OPTIONS,
  DASHBOARD_WARDS
} from '../utils';
import { formatChartData, calculateOptimalChartHeight } from '../utils/dashboardCalculations';

// Import components
import DashboardHeader from './DashboardHeader';
import DashboardCalendar from './DashboardCalendar';
import PatientCensusSection from './PatientCensusSection';
import WardSummaryDashboard from './WardSummaryDashboard';
import PatientTrendChart from './PatientTrendChart';
import WardSummaryTable from './WardSummaryTable';
import ShiftComparisonPanel from './ShiftComparisonPanel';
import CalendarWithEvents, { Event } from './CalendarWithEvents';
import WardCensusButtons from './WardCensusButtons';

// Import types
import { PieChartDataItem } from './EnhancedPieChart';
import { 
  WardSummaryData, 
  WardSummaryDataWithShifts, 
  WardCensusData, 
  ViewType, 
  CalendarMarker,
  DailyPatientData
} from './types';
import { TrendData } from './types/index';

// Import sections
import { StatisticsSummary, ChartSection } from './sections';

// Define interfaces for type safety
interface WardCensusMapEntry {
  wardName: string;
  patientCount: number;
  morningPatientCount: number;
  nightPatientCount: number;
}

// Fix user interface for ChartSection props
interface UserForChartSection {
  floor?: string;
}

function RefactoredDashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.SUMMARY);
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [markers, setMarkers] = useState<CalendarMarker[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const [bedCensusData, setBedCensusData] = useState<WardCensusData[]>([]);
  
  // refs สำหรับ scroll
  const shiftComparisonRef = useRef<HTMLDivElement>(null);
  const wardSummaryRef = useRef<HTMLDivElement>(null);
  const patientTrendRef = useRef<HTMLDivElement>(null);

  // ใช้ custom hook เพื่อดึงข้อมูล Dashboard
  const {
    wardCensusMap,
    summaryDataList,
    tableData,
    totalStats,
    loading: dataLoading,
    error: dataError,
    refreshData
  } = useDashboardData(selectedDate, startDate, endDate, dateRange, user, wards);

  // ใช้ hook สำหรับข้อมูล Trend
  const {
    trendData,
    selectedTrendWards,
    trendDateRange,
    customTrendStart,
    customTrendEnd,
    loading: trendLoading,
    toggleTrendWard,
    setQuickTrendDateRange,
    applyCustomTrendDateRange,
    setCustomTrendStart,
    setCustomTrendEnd,
    trendChartData,
    filteredTrendChartData,
    fetchTrendDataHandler,
    setSelectedTrendWards
  } = useTrendData(user, wards, effectiveDateRange);

  // ใช้ hook สำหรับข้อมูลผู้ป่วยรายวัน
  const {
    dailyPatientData,
    dateRangeForDailyChart,
    customStartDate,
    customEndDate,
    loading: dailyDataLoading,
    setDateRangeForDailyChart,
    setCustomStartDate,
    setCustomEndDate,
    fetchDailyData
  } = useDailyPatientData(user, wards, selectedWardId);

  // ฟังก์ชันสำหรับจัดการเมื่อมีการเปลี่ยนช่วงวันที่
  const handleDateRangeChange = useCallback((value: string) => {
    setDateRange(value);
    // ตั้งค่าช่วงวันที่ตามตัวเลือกที่เลือก
    switch(value) {
      case 'today':
        // วันนี้
        setEffectiveDateRange({
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        });
        
        // อัปเดต startDate และ endDate ให้เป็นวันเดียวกัน
        const today = format(new Date(), 'yyyy-MM-dd');
        setStartDate(today);
        setEndDate(today);
        break;
      case 'custom':
        // ใช้ค่า startDate และ endDate ที่ผู้ใช้กำหนด
        if (startDate && endDate) {
          setEffectiveDateRange({
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate))
          });
        }
        break;
      case 'all':
        // แสดงข้อมูลทั้งหมด
        setEffectiveDateRange({
          start: startOfDay(parseISO('2021-01-01')), // หรือวันที่เริ่มต้นที่ต้องการ
          end: endOfDay(new Date()) // วันปัจจุบัน
        });
        break;
      default:
        // ค่าดีฟอลต์คือวันนี้
        setEffectiveDateRange({
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        });
        break;
    }
  }, [startDate, endDate]);

  // อัพเดทเวลามีการเปลี่ยนแปลง Ward ที่เลือก
  const handleSelectWard = useCallback((wardId: string) => {
    // ถ้า wardId เป็นค่าว่าง ให้แสดงทุกแผนก
    if (wardId === "") {
      setSelectedWardId(null);
      logInfo(`[handleSelectWard] Selecting all departments`);
    } else {
      setSelectedWardId(wardId);
      logInfo(`[handleSelectWard] Selected ward: ${wardId}`);
    }
    
    // รีเฟรชข้อมูลหลังจากเปลี่ยน ward
    refreshData(wardId === "" ? null : wardId);
  }, [refreshData]);

  // ฟังก์ชันสำหรับจัดการเมื่อมีการเปลี่ยนวันที่
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    logInfo(`[handleDateChange] Selected date: ${format(date, 'yyyy-MM-dd')}`);
  }, []);

  // ฟังก์ชันโหลดข้อมูลแผนก
  const loadWards = useCallback(async () => {
    try {
      logInfo('[loadWards] Fetching wards...');
      setLoading(true);
      
      // ดึงข้อมูลแผนกตามสิทธิ์การเข้าถึงของผู้ใช้
      const wardsData = await getWardsByUserPermission(user!);
      
      if (wardsData && wardsData.length > 0) {
        setWards(wardsData);
        
        // ถ้าผู้ใช้เป็น User ทั่วไป ให้เลือก ward ของตัวเองเป็นค่าเริ่มต้น
        if (isRegularUser(user) && user?.floor) {
          setSelectedWardId(user.floor);
          logInfo(`[loadWards] Setting default ward for regular user: ${user.floor}`);
        }
        
        logInfo(`[loadWards] Loaded ${wardsData.length} wards`);
      } else {
        setError('ไม่พบข้อมูลแผนก');
        logError('[loadWards] No wards found');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก');
      logError('[loadWards] Error loading wards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // โหลดข้อมูลเครื่องหมายปฏิทิน
  const loadCalendarMarkers = useCallback(async () => {
    try {
      const data = await fetchCalendarMarkers(new Date(), selectedWardId || '');
      setMarkers(data);
      logInfo(`[loadCalendarMarkers] Loaded ${data.length} calendar markers`);
    } catch (err) {
      logError('[loadCalendarMarkers] Error loading calendar markers:', err);
    }
  }, [selectedWardId]);

  // โหลดข้อมูลแผนภูมิวงกลม
  const loadPieChartData = useCallback(async () => {
    try {
      // ดึงข้อมูลสรุปสำหรับแผนภูมิวงกลม
      const data = await calculateBedSummary(selectedDate, wards);
      setPieChartData(data);
    } catch (err) {
      logError('[loadPieChartData] Error loading pie chart data:', err);
    }
  }, [selectedDate, wards]);

  // แปลงข้อมูลสำหรับแผนภูมิแท่ง
  const processBedCensusData = useCallback(() => {
    if (!wardCensusMap) return;
    
    // กรองเฉพาะแผนกที่ต้องการแสดงผล
    const filteredData: WardCensusData[] = Array.from(wardCensusMap.entries())
      .filter(([wardId]) => DASHBOARD_WARDS.includes(wardId.toUpperCase()))
      .map(([wardId, data]) => {
        const wardData = data as unknown as WardCensusMapEntry;
        return {
        id: wardId,
          wardName: wardData.wardName || wardId,
          patientCount: wardData.patientCount || 0,
          morningPatientCount: wardData.morningPatientCount || 0,
          nightPatientCount: wardData.nightPatientCount || 0
        };
      })
      .sort((a, b) => a.wardName.localeCompare(b.wardName));
    
    setBedCensusData(filteredData);
  }, [wardCensusMap]);

  // โหลดข้อมูลเมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    if (user) {
      loadWards();
    }
  }, [user, loadWards]);

  // โหลดข้อมูลหลังจากโหลดแผนก
  useEffect(() => {
    if (wards.length > 0) {
      refreshData(selectedWardId);
      loadCalendarMarkers();
      
      // โหลดข้อมูลแนวโน้ม
      fetchTrendDataHandler();
      
      // โหลดข้อมูลรายวัน
      fetchDailyData();
    }
  }, [wards, selectedWardId, refreshData, loadCalendarMarkers, fetchTrendDataHandler, fetchDailyData]);

  // อัปเดตข้อมูลแผนภูมิเมื่อข้อมูล ward census เปลี่ยนแปลง
  useEffect(() => {
    if (wardCensusMap) {
      loadPieChartData();
      processBedCensusData();
    }
  }, [wardCensusMap, loadPieChartData, processBedCensusData]);

  // ฟังก์ชันการเลื่อนไปยังส่วนต่างๆ
  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const applyCustomDateRange = () => handleDateRangeChange('custom');

  // แสดงข้อความโหลดหรือข้อผิดพลาด
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-2xl text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || dataError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-2xl text-red-500">
              เกิดข้อผิดพลาด: {error || dataError}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto p-4">
        <DashboardHeader
          user={user}
          selectedDate={selectedDate}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          wards={wards}
          applyCustomDateRange={applyCustomDateRange}
        />

        {/* สรุปสถิติ */}
        <StatisticsSummary
          totalStats={totalStats}
          loading={dataLoading}
        />

        {/* ปฏิทินและตารางข้อมูล */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-1">
            <DashboardCalendar
              selectedDate={new Date(selectedDate)}
              onDateChange={handleDateChange}
              markers={markers}
            />
          </div>
          <div className="lg:col-span-2">
            <WardSummaryTable 
              data={tableData}
              loading={dataLoading}
              totalStats={totalStats} 
            />
          </div>
        </div>

        {/* แผนภูมิกราฟแท่ง */}
        <ChartSection
          bedCensusData={bedCensusData}
          pieChartData={pieChartData}
          loading={dataLoading}
          selectedWardId={selectedWardId}
          handleSelectWard={handleSelectWard}
          user={user ? {
            floor: user.floor || undefined
          } : null}
          isRegularUser={isRegularUser(user)}
        />

        {/* เปรียบเทียบกะ */}
        <div ref={shiftComparisonRef} className="mb-8">
          <ShiftComparisonPanel
            selectedWardId={selectedWardId}
            selectedDate={selectedDate}
            wards={wards}
            loading={dailyDataLoading}
            onWardChange={handleSelectWard}
            patientData={dailyPatientData}
          />
        </div>

        {/* ข้อมูลสรุปแผนก */}
        <div ref={wardSummaryRef} className="mb-8">
          <WardSummaryDashboard
            summaryData={summaryDataList}
            loading={dataLoading}
            selectedDate={selectedDate}
          />
        </div>

        {/* แนวโน้มผู้ป่วย */}
        <div ref={patientTrendRef} className="mb-8">
          <PatientTrendChart
            data={filteredTrendChartData as unknown as TrendData[]}
            loading={trendLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default RefactoredDashboardPage; 