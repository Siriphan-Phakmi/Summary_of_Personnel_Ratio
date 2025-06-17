'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, startOfDay, endOfDay, addMonths, subMonths } from 'date-fns';
import { useAuth } from '@/app/features/auth';
import { Ward } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';

// Import custom hooks
import { 
  useDashboardData,
  useTrendData,
  useDailyPatientData,
  useCalendarAndChartData
} from '../hooks';

// Import services
import { getWardsByUserPermission } from '../services';

// Import utils
import { logInfo, logError, isRegularUser, adaptArrayToNewWardSummaryFormat } from '../utils';

// Import components
import DashboardHeader from './DashboardHeader';
import DashboardCalendar from './DashboardCalendar';
import WardSummaryDashboard from './WardSummaryDashboard';
import PatientTrendChart from './PatientTrendChart';
import WardSummaryTable from './WardSummaryTable';
import ShiftComparisonPanel from './ShiftComparisonPanel';

// Import types
import { TrendData } from './types/index';

// Import sections
import { StatisticsSummary, ChartSection } from './sections';

// Import UI components
import { LoadingScreen, ErrorScreen } from './ui';

// A more flexible type for ward filtering
type WardFilterOption = 'all' | 'my_wards' | string;

function RefactoredDashboardPage() {
  const { user, authStatus } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [wardFilter, setWardFilter] = useState<WardFilterOption>('all');
  
  const shiftComparisonRef = useRef<HTMLDivElement>(null);
  const wardSummaryRef = useRef<HTMLDivElement>(null);
  const patientTrendRef = useRef<HTMLDivElement>(null);

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');

  const {
    tableData,
    totalStats,
    loading: dataLoading,
    error: dataError,
    refreshData,
    summaryDataList
  } = useDashboardData(formattedSelectedDate, startDate, endDate, dateRange, user, wards);

  const {
    calendarMarkers,
    isLoadingCalendar,
    calendarError,
    pieChartData,
    bedCensusData,
    isLoadingBedCensus,
    bedCensusError,
    totalBedData
  } = useCalendarAndChartData({
    selectedDate: selectedDate,
    user
  });

  const {
    loading: trendLoading,
    filteredTrendChartData,
  } = useTrendData(user, wards, effectiveDateRange);

  const {
    fetchDailyData,
    dailyPatientData,
    loading: dailyDataLoading,
  } = useDailyPatientData(user, wards, selectedWardId);

  const handleDateRangeChange = useCallback((value: string) => {
    setDateRange(value);
    switch(value) {
      case 'today':
        setEffectiveDateRange({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
        const today = format(new Date(), 'yyyy-MM-dd');
        setStartDate(today);
        setEndDate(today);
        break;
      case 'custom':
        if (startDate && endDate) {
          setEffectiveDateRange({ start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) });
        }
        break;
      case 'all':
        setEffectiveDateRange({ start: startOfDay(parseISO('2021-01-01')), end: endOfDay(new Date()) });
        break;
      default:
        setEffectiveDateRange({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
        break;
    }
  }, [startDate, endDate]);

  const handleSelectWard = useCallback((wardId: string) => {
    const newWardId = wardId === "" ? null : wardId;
    setSelectedWardId(newWardId);
    logInfo(`[handleSelectWard] Selected ward: ${newWardId}`);
    refreshData(newWardId);
  }, [refreshData]);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    logInfo(`[handleDateChange] Selected date: ${format(date, 'yyyy-MM-dd')}`);
  }, []);

  const loadWards = useCallback(async () => {
    if (!user) return;
    try {
      logInfo('[loadWards] Fetching wards...');
      setLoading(true);
      const wardsData = await getWardsByUserPermission(user);
      if (wardsData && wardsData.length > 0) {
        setWards(wardsData);
        if (isRegularUser(user) && user.floor) {
          setSelectedWardId(user.floor);
        }
        logInfo(`[loadWards] Loaded ${wardsData.length} wards`);
      } else {
        setError('ไม่พบข้อมูลแผนก');
      }
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก: ' + err.message);
      logError('[loadWards] Error loading wards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authStatus !== 'loading') {
      loadWards();
    }
  }, [authStatus, loadWards]);

  useEffect(() => {
    if (wards.length > 0) {
      refreshData(selectedWardId);
      fetchDailyData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards, selectedWardId]);

  if (authStatus === 'loading' || loading || dataLoading) {
    return <LoadingScreen />;
  }

  if (authStatus === 'unauthenticated') {
    return <ErrorScreen error="กรุณาเข้าสู่ระบบเพื่อดูข้อมูลสรุป" />;
  }
  
  if (error || dataError) {
    return <ErrorScreen error={error || dataError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4">
        <DashboardHeader
          user={user}
          selectedDate={selectedDate}
          onDateRangeChange={handleDateRangeChange}
          dateRange={dateRange}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          wards={wards}
          applyCustomDateRange={() => handleDateRangeChange('custom')}
        />

        <StatisticsSummary totalStats={totalStats} loading={dataLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-1">
            <DashboardCalendar
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              markers={calendarMarkers || []}
              isLoading={isLoadingCalendar}
            />
            {calendarError && <div className="mt-2 text-red-500 text-sm">{calendarError}</div>}
          </div>
          <div className="lg:col-span-2">
            <WardSummaryTable 
              data={adaptArrayToNewWardSummaryFormat(tableData)}
              loading={dataLoading}
              selectedWardId={selectedWardId || ''}
              onSelectWard={handleSelectWard}
            />
          </div>
        </div>

        <ChartSection
          bedCensusData={bedCensusData}
          pieChartData={pieChartData}
          loading={dataLoading || isLoadingBedCensus}
          selectedWardId={selectedWardId}
          handleSelectWard={handleSelectWard}
          user={user}
          isRegularUser={isRegularUser(user)}
        />

        <div ref={shiftComparisonRef} className="mb-8">
          <ShiftComparisonPanel
            selectedWardId={selectedWardId}
            selectedDate={formattedSelectedDate}
            wards={wards}
            loading={dailyDataLoading}
            onWardChange={handleSelectWard}
            patientData={dailyPatientData}
          />
        </div>

        <div ref={wardSummaryRef} className="mb-8">
          <WardSummaryDashboard
            summaryData={adaptArrayToNewWardSummaryFormat(summaryDataList)}
            loading={dataLoading}
            selectedDate={formattedSelectedDate}
          />
        </div>

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