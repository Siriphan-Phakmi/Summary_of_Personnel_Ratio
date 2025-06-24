'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/features/auth';
import { Ward, FormStatus, ShiftType } from '@/app/features/ward-form/types/ward';
import { getWardsByUserPermission, getActiveWards } from '@/app/features/ward-form/services/wardService';
import { getShiftStatusesForDay } from '@/app/features/ward-form/services/queries/wardFormQueries';
import { formatDateYMD } from '@/app/lib/utils/dateUtils';
import { useFormConfig } from '@/app/features/config/hooks/useFormConfig';
import { showErrorToast } from '@/app/lib/utils/toastUtils';
import { UserRole } from '@/app/features/auth/types/user';

export const useDailyCensusFormLogic = () => {
  const { user } = useAuth();
  const { formConfig, loading: configLoading, error: configError } = useFormConfig('daily-census');

  // State
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateYMD(new Date()));
  
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [morningShiftStatus, setMorningShiftStatus] = useState<FormStatus | null>(null);
  const [nightShiftStatus, setNightShiftStatus] = useState<FormStatus | null>(null);
  
  const [reloadDataTrigger, setReloadDataTrigger] = useState(0);

  // Memoized derived values
  const selectedWardObject = wards.find(w => w.id === selectedWard);
  const isSingleWardUser = wards.length === 1 && user?.role === UserRole.NURSE;

  // --- DATA FETCHING ---

  // Fetch wards based on user permissions
  const fetchWards = useCallback(async () => {
    if (!user) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    setDataError(null);
    try {
      let userWards = await getWardsByUserPermission(user);
      
      // Fallback: If no specific wards, get all active wards
      if (userWards.length === 0) {
        console.log(`User ${user.username} has no specific wards, falling back to all active wards.`);
        userWards = await getActiveWards();
      }

      if (userWards.length === 0) {
        setDataError('ไม่พบข้อมูลแผนกที่ใช้งานในระบบ หรือท่านยังไม่ได้รับมอบหมายแผนก กรุณาติดต่อผู้ดูแลระบบ');
        setWards([]);
      } else {
        setWards(userWards);
        // Set default selected ward only if it's not already set
        if (!selectedWard && userWards.length > 0) {
          setSelectedWard(userWards[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching wards:', err);
      setDataError('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก');
      showErrorToast('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก');
      setWards([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [user]); // Remove selectedWard dependency to prevent infinite loop

  // Fetch statuses for the selected ward and date
  const fetchStatuses = useCallback(async () => {
    if (!selectedWard || !selectedDate) return;

    try {
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const { morning, night } = await getShiftStatusesForDay(selectedWard, targetDate);
      setMorningShiftStatus(morning);
      setNightShiftStatus(night);
    } catch (error) {
      console.error("Error fetching shift statuses:", error);
      showErrorToast('เกิดข้อผิดพลาดในการโหลดสถานะกะ');
      setMorningShiftStatus(null);
      setNightShiftStatus(null);
    }
  }, [selectedWard, selectedDate]);

  // --- EFFECTS ---

  // Initial ward fetch with timeout
  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        if (isDataLoading) {
          console.warn('[DailyCensusFormLogic] Ward fetching timeout after 10 seconds');
          setIsDataLoading(false);
          setDataError('การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
        }
      }, 10000); // 10 second timeout

      fetchWards().finally(() => {
        clearTimeout(timeoutId);
      });

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [user]); // Only depend on user, not fetchWards

  // Fetch statuses when ward, date, or trigger changes
  useEffect(() => {
    if (selectedWard && selectedDate) {
      fetchStatuses();
    }
  }, [selectedWard, selectedDate, reloadDataTrigger]); // Only depend on the actual values
  
  // Auto-refresh on window focus to get latest data
  useEffect(() => {
    const handleFocus = () => {
      setReloadDataTrigger(prev => prev + 1);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // --- EVENT HANDLERS ---

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  }, []);

  const handleWardChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWard(e.target.value);
  }, []);
  
  const handleReload = useCallback(() => {
      setReloadDataTrigger(prev => prev + 1);
  }, []);

  return {
    user,
    formConfig,
    wards,
    selectedWard,
    selectedDate,
    isDataLoading,
    dataError,
    morningShiftStatus,
    nightShiftStatus,
    selectedWardObject,
    isSingleWardUser,
    handleDateChange,
    handleWardChange,
    handleReload,
  };
};

export default useDailyCensusFormLogic; 