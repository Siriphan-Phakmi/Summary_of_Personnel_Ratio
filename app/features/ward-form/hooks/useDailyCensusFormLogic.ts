'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/features/auth';
import { Ward, FormStatus } from '@/app/features/ward-form/types/ward';
import { getWardsByUserPermission } from '../services/wardService';
import { getShiftStatusesForDay } from '../services/wardFormService';
import { showErrorToast } from '@/app/lib/utils/toastUtils';
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

  // Effect to load wards based on the current user
  useEffect(() => {
    const loadWards = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const userWards = await getWardsByUserPermission(currentUser);
        setWards(userWards);

        if (userWards.length > 0) {
          // Check if the current selection is valid within the new list of wards.
          const currentSelectionIsValid = userWards.some(w => w.id === selectedWard);

          // If the selection is not valid (e.g., stale from another user) 
          // or no ward is selected yet, default to the first ward in the new list.
          if (!currentSelectionIsValid) {
            setSelectedWard(userWards[0].id);
          }
        } else {
          // If the user has no accessible wards, clear the selection.
          setSelectedWard('');
        }
        
      } catch (error) {
        console.error('Error loading wards:', error);
        showErrorToast('ไม่สามารถโหลดข้อมูลแผนกได้');
      } finally {
        setLoading(false);
      }
    };
    loadWards();
    // This effect should only re-run when the user context changes.
    // selectedWard is managed inside, so it's not needed as a dependency.
  }, [currentUser, setWards, setLoading, setSelectedWard]);

  // Determine if the user has only one ward assigned.
  const isSingleWardUser =
    wards.length === 1 &&
    currentUser?.role === UserRole.NURSE;

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
    isSingleWardUser,
  };
};

export default useDailyCensusFormLogic; 