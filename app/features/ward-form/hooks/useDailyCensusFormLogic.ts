'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/features/auth';
import { Ward, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { getWardsByUserPermission } from '../services/wardService';
import { getShiftStatusesForDay } from '../services/wardFormService';
// import { useOptimizedLoading } from '@/hooks/useOptimizedLoading'; // @/app/core/hooks/useOptimizedLoading -> @/hooks/useOptimizedLoading
import { showErrorToast } from '@/utils/toastUtils';
import { format } from 'date-fns';
import { UserRole } from '@/app/features/auth/types/user';

export const useDailyCensusFormLogic = () => {
  const { user: currentUser } = useAuth();
  // const optimizedLoading = useOptimizedLoading({ debounceMs: 200, cacheTimeMs: 30000 });
  const [loading, setLoading] = useState(false); // temp replacement
  
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [reloadDataTrigger, setReloadDataTrigger] = useState(0);
  const [actualMorningStatus, setActualMorningStatus] = useState<FormStatus | null>(null);
  const [actualNightStatus, setActualNightStatus] = useState<FormStatus | null>(null);

  // Load wards with caching
  useEffect(() => {
    const loadWards = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const userWards = await getWardsByUserPermission(currentUser);
        
        setWards(userWards);

        // Auto-select ward based on user role
        if ((currentUser.role === UserRole.NURSE || currentUser.role === UserRole.USER) && currentUser.floor) {
          const userWard = userWards.find((ward: Ward) => ward.id === currentUser.floor);
          if (userWard && selectedWard !== userWard.id) {
            setSelectedWard(userWard.id);
          } else if (!userWard) {
            console.warn(`[DailyCensusForm] User with floor ${currentUser.floor} does not have access to that ward.`);
            showErrorToast('คุณไม่มีสิทธิ์ในการเข้าถึงแผนกที่กำหนดไว้');
          }
        } else if (userWards.length > 0 && !selectedWard) {
          setSelectedWard(userWards[0].id);
        }
      } catch (error) {
        console.error('Error loading wards:', error);
        showErrorToast('ไม่สามารถโหลดข้อมูลแผนกได้');
      } finally {
        setLoading(false);
      }
    };
    loadWards();
  }, [currentUser?.uid]);

  // Find the full ward object and business ID
  const selectedWardObject = wards.find(w => w.id === selectedWard);
  const selectedBusinessWardId = selectedWardObject?.id || '';

  // Fetch shift statuses
  useEffect(() => {
    if (!selectedBusinessWardId || !selectedDate) {
      setActualMorningStatus(null);
      setActualNightStatus(null);
      return;
    }

    const fetchStatuses = async () => {
      try {
        setLoading(true);
        const targetDate = new Date(selectedDate + 'T00:00:00');
        
        const { morning, night } = await getShiftStatusesForDay(selectedBusinessWardId, targetDate);
        
        setActualMorningStatus(morning);
        setActualNightStatus(night);
      } catch (error) {
        console.error("Error fetching shift statuses:", error);
        showErrorToast('เกิดข้อผิดพลาดในการโหลดสถานะกะ');
        setActualMorningStatus(null);
        setActualNightStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [selectedBusinessWardId, selectedDate, reloadDataTrigger]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      setReloadDataTrigger(prev => prev + 1);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Event handlers
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  }, []);

  const handleWardChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWard(e.target.value);
  }, []);

  return {
    currentUser,
    wards,
    selectedWard,
    selectedDate,
    selectedWardObject,
    selectedBusinessWardId,
    actualMorningStatus,
    actualNightStatus,
    reloadDataTrigger,
    setReloadDataTrigger,
    handleDateChange,
    handleWardChange,
  };
};

export default useDailyCensusFormLogic; 