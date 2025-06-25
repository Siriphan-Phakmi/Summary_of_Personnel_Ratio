'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/app/features/auth/types/user';
import { PieChartDataItem } from '../components/types/chart-types';
import { WardCensusData, WardCensusMapEntry } from '../components/types/dashboardPageTypes';
import { CalendarMarker } from '../services/calendarService';
import { fetchCalendarMarkers } from '../services';
import { DASHBOARD_WARDS } from '../utils';
import { logInfo, logError } from '../utils';

export interface UseCalendarAndChartDataProps {
  selectedDate: Date;
  user: User | null;
}

export interface UseCalendarAndChartDataReturn {
  calendarMarkers: CalendarMarker[];
  isLoadingCalendar: boolean;
  calendarError: string | null;
  pieChartData: PieChartDataItem[];
  isLoadingPieChart: boolean;
  pieChartError: string | null;
  bedCensusData: WardCensusData[];
  isLoadingBedCensus: boolean;
  bedCensusError: string | null;
  totalBedData: { available: number; occupied: number; percentage: number };
}

export const useCalendarAndChartData = ({
  selectedDate,
  user
}: UseCalendarAndChartDataProps): UseCalendarAndChartDataReturn => {
  // Calendar markers state
  const [calendarMarkers, setCalendarMarkers] = useState<CalendarMarker[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  // Pie chart data state
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]);
  const [isLoadingPieChart, setIsLoadingPieChart] = useState<boolean>(false);
  const [pieChartError, setPieChartError] = useState<string | null>(null);
  
  // Bed census data state
  const [bedCensusData, setBedCensusData] = useState<WardCensusData[]>([]);
  const [wardCensusMap, setWardCensusMap] = useState<WardCensusMapEntry[]>([]);
  const [isLoadingBedCensus, setIsLoadingBedCensus] = useState<boolean>(false);
  const [bedCensusError, setBedCensusError] = useState<string | null>(null);
  

  // Total bed data summary
  const [totalBedData, setTotalBedData] = useState<{
    available: number;
    occupied: number;
    percentage: number;
  }>({ available: 0, occupied: 0, percentage: 0 });

  // Calendar markers loader
  const loadCalendarMarkers = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingCalendar(true);
    setCalendarError(null);
    
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const markers = await fetchCalendarMarkers(
        startDate,
        ''
      );
      
      setCalendarMarkers(markers);
      logInfo(`[loadCalendarMarkers] Loaded ${markers.length} calendar markers`);
    } catch (error) {
      console.error('Error loading calendar markers:', error);
      setCalendarError('Failed to load calendar data');
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [selectedDate, user]);

  // Load pie chart data
  const loadPieChartData = useCallback(async () => {
    if (!user || wardCensusMap.length === 0) return;
    
    setIsLoadingPieChart(true);
    setPieChartError(null);
    
    try {
      const pieData: PieChartDataItem[] = DASHBOARD_WARDS.map(wardId => {
        const wardEntry = wardCensusMap.find(entry => entry.wardId === wardId);
        
        return {
          id: wardId,
          wardName: wardEntry?.wardName || wardId,
          name: wardEntry?.wardName || wardId,
          value: wardEntry?.censusData?.occupiedBeds || 0,
          total: wardEntry?.censusData?.totalBeds || 0,
        };
      }).filter(item => item.total > 0);
      
      setPieChartData(pieData);
    } catch (error) {
      console.error('Error loading pie chart data:', error);
      setPieChartError('Failed to load chart data');
    } finally {
      setIsLoadingPieChart(false);
    }
  }, [wardCensusMap, user]);

  // Process bed census data
  const processBedCensusData = useCallback(() => {
    if (!user || wardCensusMap.length === 0) return;
    
    setIsLoadingBedCensus(true);
    setBedCensusError(null);
    
    try {
      // Convert ward census map to WardCensusData format
      const wardData: WardCensusData[] = wardCensusMap.map(entry => ({
        id: entry.wardId,
        wardId: entry.wardId,
        wardName: entry.wardName,
        occupiedBeds: entry.censusData?.occupiedBeds || 0,
        totalBeds: entry.censusData?.totalBeds || 0,
        percentage: entry.censusData?.percentage || 0,
        patientCount: entry.censusData?.occupiedBeds || 0,
      }));
      
      setBedCensusData(wardData);
      
      // Calculate total summary from processed ward data
      const totalOccupied = wardData.reduce((sum, ward) => sum + (ward.occupiedBeds || 0), 0);
      const totalBeds = wardData.reduce((sum, ward) => sum + (ward.totalBeds || 0), 0);
      const totalAvailable = totalBeds - totalOccupied;
      const totalPercentage = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;
      
      setTotalBedData({
        available: totalAvailable,
        occupied: totalOccupied,
        percentage: Math.round(totalPercentage * 100) / 100
      });
      
    } catch (error) {
      console.error('Error processing bed census data:', error);
      setBedCensusError('Failed to process bed data');
    } finally {
      setIsLoadingBedCensus(false);
    }
  }, [wardCensusMap, user]);

  // Effects for data loading
  useEffect(() => {
    loadCalendarMarkers();
  }, [loadCalendarMarkers]);

  useEffect(() => {
    if (wardCensusMap.length > 0) {
      loadPieChartData();
      processBedCensusData();
    }
  }, [wardCensusMap]);

  return {
    calendarMarkers,
    isLoadingCalendar,
    calendarError,
    pieChartData,
    isLoadingPieChart,
    pieChartError,
    bedCensusData,
    isLoadingBedCensus,
    bedCensusError,
    totalBedData
  };
};

export default useCalendarAndChartData;
