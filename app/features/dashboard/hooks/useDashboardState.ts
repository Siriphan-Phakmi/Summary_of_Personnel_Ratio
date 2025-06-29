import { useState } from 'react';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ViewType } from '../components/types';

export const useDashboardState = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentView, setCurrentView] = useState<ViewType>('summary');
  const [effectiveDateRange, setEffectiveDateRange] = useState<{start: Date, end: Date}>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });

  return {
    selectedDate,
    setSelectedDate,
    loading,
    setLoading,
    error,
    setError,
    dateRange,
    setDateRange,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    currentView,
    setCurrentView,
    effectiveDateRange,
    setEffectiveDateRange
  };
}; 