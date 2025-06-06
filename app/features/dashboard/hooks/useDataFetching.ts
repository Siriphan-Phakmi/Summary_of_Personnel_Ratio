import { useState, useCallback } from 'react';
import { 
  getAllWards, 
  fetchCalendarMarkers
} from '../services';
import { logError, calculateBedSummary } from '../utils';
import { CalendarMarker } from '../components/types';
import { PieChartDataItem } from '../components/EnhancedPieChart';
import { Event } from '../components/CalendarWithEvents';
import { Ward } from '@/app/core/types/ward';

export const useDataFetching = (
  selectedDate: string, 
  wards: Ward[], 
  setPieChartData: (data: PieChartDataItem[]) => void,
  setMarkers: (markers: CalendarMarker[]) => void,
  setCalendarEvents: (events: Event[]) => void,
  setError: (error: string) => void
) => {

  const loadWards = useCallback(async () => {
    try {
      await getAllWards();
    } catch (err) {
      setError('Failed to load wards');
      logError('[loadWards] Error:', err);
    }
  }, [setError]);

  const loadPieChartData = useCallback(async () => {
    try {
      if (wards.length > 0) {
        const data = await calculateBedSummary(selectedDate, wards);
        setPieChartData(data);
      }
    } catch (err) {
      logError('[loadPieChartData] Error loading pie chart data:', err);
    }
  }, [selectedDate, wards, setPieChartData]);

  const fetchCalendarData = useCallback(async () => {
    try {
      const calendarData = await fetchCalendarMarkers(new Date(), '');
      const markers = calendarData || [];
      const events: Event[] = [];
      
      // แปลง markers เป็น events ถ้าจำเป็น
      // ในที่นี้สมมติว่า markers และ events มีรูปแบบเดียวกัน
      
      setMarkers(markers);
      setCalendarEvents(events);
    } catch (err) {
      logError('[fetchCalendarData] Error:', err);
      setError('Failed to load calendar data.');
    }
  }, [setMarkers, setCalendarEvents, setError]);

  return {
    loadWards,
    loadPieChartData,
    fetchCalendarData
  };
}; 