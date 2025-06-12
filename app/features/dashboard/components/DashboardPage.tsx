'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/app/features/auth';
import { useTheme } from 'next-themes';
import NavBar from '@/app/core/ui/NavBar';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

// Import custom hooks
import { useDashboardState } from '../hooks/useDashboardState';
import { useDataFetching } from '../hooks/useDataFetching';
import { useEventHandlers } from '../hooks/useEventHandlers';
import {
  useDashboardData,
  useTrendData,
  useDailyPatientData,
  useWardData,
} from '../hooks';

// Import services
import {
  getWardsByUserPermission,
  fetchCalendarMarkers,
} from '../services';

// Import utils
import { 
  logInfo, 
  logError, 
  getThaiDayName, 
  isRegularUser,
  DASHBOARD_WARDS,
  calculateBedSummary
} from '../utils';

// Import components
import DashboardHeader from './DashboardHeader';
import DashboardCalendar from './DashboardCalendar';
import PatientTrendChart from './PatientTrendChart';
import WardSummaryTable from './WardSummaryTable';
import ShiftComparisonPanel from './ShiftComparisonPanel';
import BedSummaryPieChart from './BedSummaryPieChart';
import NoDataMessage from './NoDataMessage';
import WardCensusButtons from './WardCensusButtons';
import WardSummaryDashboard from './WardSummaryDashboard';
import { ChartSection, StatisticsSummary } from './sections';
import CalendarWithEvents, { Event } from './CalendarWithEvents';
import LoadingSpinner from '@/app/core/components/LoadingSpinner';

// Import types
import { PieChartDataItem } from './EnhancedPieChart';
import { WardCensusData, DashboardSummary, PatientTrendData, ViewType, CalendarMarker } from './types';
import { TrendData } from './types/index';

// Import component interfaces
import {
  UserForChartSection
} from './types/componentInterfaces';

const printStyles = `
  @media print {
    body { background-color: white; }
    .no-print { display: none !important; }
    .page-container {
      width: 100%;
      margin: 0;
      padding: 0;
      transform: scale(0.95);
      transform-origin: top left;
    }
  }
`;

// Define interfaces to fix type errors
interface WardCensusDataEntry {
  patientCount: number;
  morningPatientCount: number;
  nightPatientCount: number;
  wardName: string;
}

function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  // State Management Hook
  const {
    selectedDate, setSelectedDate, loading, setLoading, error, setError,
    dateRange, setDateRange, startDate, setStartDate, endDate, setEndDate,
    effectiveDateRange, setEffectiveDateRange
  } = useDashboardState();

  // Component-specific state
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const [bedCensusData, setBedCensusData] = useState<WardCensusData[]>([]);
  const [markers, setMarkers] = useState<CalendarMarker[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  // Refs for scrolling
  const shiftComparisonRef = useRef<HTMLDivElement>(null);
  const wardSummaryRef = useRef<HTMLDivElement>(null);
  const patientTrendRef = useRef<HTMLDivElement>(null);

  // Data Hooks
  const { wards, selectedWardId, setSelectedWardId } = useWardData(user, DASHBOARD_WARDS);
  const {
    wardCensusMap, summaryDataList, tableData, totalStats,
    loading: dataLoading, error: dataError, refreshData
  } = useDashboardData(selectedDate, startDate, endDate, dateRange, user, wards);
    
  const {
    trendData, loading: trendLoading, fetchTrendDataHandler
  } = useTrendData(user, wards, effectiveDateRange);

  const {
    dailyPatientData, loading: dailyDataLoading, fetchDailyData
  } = useDailyPatientData(user, wards, selectedWardId);

  // Data Fetching Hook
  const { loadWards, loadPieChartData, fetchCalendarData } = useDataFetching(
    selectedDate, wards, setPieChartData, setMarkers, setCalendarEvents, setError
  );
  
  // Event Handlers Hook
  const {
    handleDateRangeChange, handleSelectWard, handleDateChange,
    handleActionSelect,
  } = useEventHandlers(
    setDateRange, setEffectiveDateRange, setStartDate, setEndDate,
    startDate, endDate, setSelectedWardId, refreshData,
    shiftComparisonRef, patientTrendRef, setSelectedDate,
    wards, selectedWardId, fetchTrendDataHandler, trendData
  );

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadWards(), fetchCalendarData()]).finally(() => setLoading(false));
  }, [loadWards, fetchCalendarData]);

  useEffect(() => {
    if (wardCensusMap && wards.length > 0) {
      loadPieChartData();
      processBedCensusData();
    }
  }, [wardCensusMap, wards.length]);
    
  const processBedCensusData = useCallback(() => {
    if (!wardCensusMap) return;
    const filteredData: WardCensusData[] = Array.from(wardCensusMap.entries())
      .filter(([wardId]) => DASHBOARD_WARDS.includes(wardId.toUpperCase()))
      .map(([wardId, data]) => {
        const wardInfo = wards.find(w => w.id === wardId);
        const wardData = data as unknown as WardCensusDataEntry;
        return {
          id: wardId,
          wardName: wardInfo?.wardName || 'Unknown',
          patientCount: wardData.patientCount || 0,
          morningPatientCount: wardData.morningPatientCount || 0,
          nightPatientCount: wardData.nightPatientCount || 0,
        };
      });
    setBedCensusData(filteredData);
  }, [wardCensusMap, wards]);

  if (loading || dataLoading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลแดชบอร์ด..." size="lg" fullScreen />;
  }

  if (error || dataError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold text-red-500">
          เกิดข้อผิดพลาด: {error || dataError}
        </div>
      </div>
    );
  }

  const applyCustomDateRange = () => handleDateRangeChange('custom');

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <NavBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 page-container">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <WardSummaryDashboard
              summaryData={summaryDataList}
              loading={dataLoading}
              selectedDate={selectedDate}
            />
            
            <ChartSection
              bedCensusData={bedCensusData}
              pieChartData={pieChartData}
              loading={dataLoading}
              selectedWardId={selectedWardId}
              handleSelectWard={handleSelectWard}
              user={user ? { floor: user.floor || undefined } : null}
              isRegularUser={isRegularUser(user)}
            />
            
            <div ref={patientTrendRef} className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
               <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Patient Trend</h2>
              <PatientTrendChart data={trendData as TrendData[]} loading={trendLoading} />
            </div>

            <div ref={wardSummaryRef} className="mt-6">
              <WardSummaryTable
                data={tableData}
                totalStats={totalStats}
                loading={dataLoading}
                selectedWardId={selectedWardId}
                onSelectWard={handleSelectWard}
              />
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">ปฏิทินข้อมูล</h3>
              <DashboardCalendar
                selectedDate={new Date(selectedDate)}
                onDateChange={handleDateChange}
                markers={markers}
              />
              <CalendarWithEvents events={calendarEvents} />
            </div>

            <div ref={shiftComparisonRef}>
              <ShiftComparisonPanel
                selectedWardId={selectedWardId}
                selectedDate={selectedDate}
                wards={wards}
                loading={dailyDataLoading}
                onWardChange={handleSelectWard}
                patientData={dailyPatientData}
              />
            </div>
          </div>
        </div>
        
        {isRegularUser(user) && (
          <WardCensusButtons
            wards={wards}
            wardCensusMap={wardCensusMap}
            selectedWardId={selectedWardId}
            onWardSelect={handleSelectWard}
            onActionSelect={handleActionSelect}
            isRegularUser={isRegularUser(user)}
          />
        )}
      </main>
    </div>
  );
}

export default DashboardPage;