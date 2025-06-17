'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';

// Cache สำหรับข้อมูลที่โหลดแล้ว
const formDataCache = new Map<string, { data: Partial<WardForm>; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 วินาที

export interface UseFormCacheManagerProps {
  selectedBusinessWardId: string; 
  selectedDate: string;
  selectedShift: ShiftType;
}

export interface UseFormCacheManagerReturn {
  cacheKey: string;
  getCachedData: () => Partial<WardForm> | null;
  setCachedData: (data: Partial<WardForm>) => void;
  clearCache: () => void;
  cleanupExpiredCache: () => void;
}

export const useFormCacheManager = ({
  selectedBusinessWardId,
  selectedDate,
  selectedShift
}: UseFormCacheManagerProps): UseFormCacheManagerReturn => {
  
  // Cache key สำหรับข้อมูลฟอร์ม
  const cacheKey = useMemo(() => 
    `${selectedBusinessWardId}-${selectedDate}-${selectedShift}`,
    [selectedBusinessWardId, selectedDate, selectedShift]
  );

  // ตรวจสอบ cache ก่อนโหลดข้อมูลใหม่
  const getCachedData = useCallback(() => {
    const cached = formDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cacheKey]);

  // บันทึกข้อมูลลง cache
  const setCachedData = useCallback((data: Partial<WardForm>) => {
    formDataCache.set(cacheKey, { data, timestamp: Date.now() });
  }, [cacheKey]);

  // ล้าง cache เฉพาะ key ปัจจุบัน
  const clearCache = useCallback(() => {
    formDataCache.delete(cacheKey);
  }, [cacheKey]);

  // ล้าง cache ที่หมดอายุ
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    Array.from(formDataCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        formDataCache.delete(key);
      }
    });
  }, []);

  // ทำความสะอาด cache เมื่อ component unmount
  useEffect(() => {
    return () => {
      cleanupExpiredCache();
    };
  }, [cleanupExpiredCache]);

  return {
    cacheKey,
    getCachedData,
    setCachedData,
    clearCache,
    cleanupExpiredCache
  };
};

export default useFormCacheManager; 