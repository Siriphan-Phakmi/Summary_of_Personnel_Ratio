import { useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { logInfo } from '../utils';
import { Ward } from '@/app/features/ward-form/types/ward';

export const useEventHandlers = (
  setDateRange: (range: string) => void,
  setEffectiveDateRange: (range: { start: Date; end: Date }) => void,
  setStartDate: (date: string) => void,
  setEndDate: (date: string) => void,
  startDate: string,
  endDate: string,
  setSelectedWardId: (id: string | null) => void,
  refreshData: (wardId?: string | null) => void,
  shiftComparisonRef: React.RefObject<HTMLDivElement>,
  patientTrendRef: React.RefObject<HTMLDivElement>,
  setSelectedDate: (date: string) => void,
  wards: Ward[],
  selectedWardId: string | null,
  fetchTrendDataHandler: () => void,
  trendData: any[]
) => {
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
  }, [startDate, endDate, setDateRange, setEffectiveDateRange, setStartDate, setEndDate]);

  const handleSelectWard = useCallback((wardId: string) => {
    const newWardId = wardId === "" ? null : wardId;
    setSelectedWardId(newWardId);
    logInfo(`[handleSelectWard] Selecting ${newWardId ? `ward: ${newWardId}` : 'all departments'}`);
    refreshData(newWardId);
    if (newWardId) {
      shiftComparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      patientTrendRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [refreshData, setSelectedWardId, shiftComparisonRef, patientTrendRef]);

  const handleDateChange = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    logInfo(`[handleDateChange] Selected date: ${dateStr}`);
  }, [setSelectedDate]);

  const handleActionSelect = useCallback((action: string) => {
    switch (action) {
      case 'comparison':
        if (!selectedWardId && wards.length > 0) {
          const firstWardId = wards[0].id || '';
          setSelectedWardId(firstWardId);
          refreshData(firstWardId);
        }
        shiftComparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'trend':
        patientTrendRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (trendData.length === 0) {
          fetchTrendDataHandler();
        }
        break;
      case 'refresh':
        refreshData(selectedWardId);
        break;
      default:
        break;
    }
  }, [selectedWardId, wards, refreshData, setSelectedWardId, shiftComparisonRef, patientTrendRef, trendData, fetchTrendDataHandler]);
  
  const scrollToSection = useCallback((sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return {
    handleDateRangeChange,
    handleSelectWard,
    handleDateChange,
    handleActionSelect,
    scrollToSection
  };
}; 