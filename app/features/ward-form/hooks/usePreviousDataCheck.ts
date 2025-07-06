'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { findWardForm } from '@/app/features/ward-form/services/wardFormService';
import { Timestamp } from 'firebase/firestore';

interface UsePreviousDataCheckProps {
  selectedWard: string;
  selectedDate: string;
  enabled?: boolean; // เปิด/ปิดการตรวจสอบ
}

interface UsePreviousDataCheckReturn {
  hasPreviousData: boolean;
  isLoading: boolean;
  error: string | null;
  previousNightData: {
    patientCensus?: number;
    wardName?: string;
    recordedBy?: string;
  } | null;
}

export const usePreviousDataCheck = ({
  selectedWard,
  selectedDate,
  enabled = true,
}: UsePreviousDataCheckProps): UsePreviousDataCheckReturn => {
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousNightData, setPreviousNightData] = useState<{
    patientCensus?: number;
    wardName?: string;
    recordedBy?: string;
  } | null>(null);

  const checkPreviousData = useCallback(async () => {
    if (!enabled || !selectedWard || !selectedDate) {
      setHasPreviousData(false);
      setPreviousNightData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // คำนวณวันที่ย้อนหลัง 1 วัน
      const currentDate = new Date(selectedDate + 'T00:00:00');
      const previousDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
      const previousDateTimestamp = Timestamp.fromDate(previousDate);

      // ค้นหาข้อมูลกะดึกของวันก่อน
      const previousNightForm = await findWardForm({
        date: previousDateTimestamp,
        shift: ShiftType.NIGHT,
        wardId: selectedWard,
      });

      if (previousNightForm && 
          (previousNightForm.status === FormStatus.FINAL || 
           previousNightForm.status === FormStatus.APPROVED)) {
        setHasPreviousData(true);
        setPreviousNightData({
          patientCensus: previousNightForm.patientCensus,
          wardName: previousNightForm.wardName,
          recordedBy: `${previousNightForm.recorderFirstName || ''} ${previousNightForm.recorderLastName || ''}`.trim(),
        });
      } else {
        setHasPreviousData(false);
        setPreviousNightData(null);
      }
    } catch (err) {
      console.error('Error checking previous data:', err);
      setError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูลย้อนหลัง');
      setHasPreviousData(false);
      setPreviousNightData(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, selectedWard, selectedDate]);

  useEffect(() => {
    checkPreviousData();
  }, [checkPreviousData]);

  return {
    hasPreviousData,
    isLoading,
    error,
    previousNightData,
  };
};

export default usePreviousDataCheck; 