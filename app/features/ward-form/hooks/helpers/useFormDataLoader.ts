'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { findWardForm } from '../../services/wardFormService';
import { showErrorToast } from '@/app/lib/utils/toastUtils';
import { Timestamp } from 'firebase/firestore';
import {
  initialFormStructure,
  convertFormDataFromFirebase,
} from '../useWardFormDataHelpers';
// 🔒 SECURITY FIX: ลบ localStorage imports เพื่อความปลอดภัย
// import localStorage helpers (ไม่ใช้แล้ว)

const formDataCache = new Map<string, { data: Partial<WardForm>; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 วินาที

export interface UseFormDataLoaderProps {
  selectedBusinessWardId: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  reloadDataTrigger: number;
}

export interface UseFormDataLoaderReturn {
  formData: Partial<WardForm>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<WardForm>>>;
  isLoading: boolean;
  error: string | null;
  isFormReadOnly: boolean;
  isDraftLoaded: boolean;
  isFinalDataFound: boolean;
  isFormDirty: boolean;
  setIsFormDirty: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: (forceRefetch?: boolean) => Promise<void>;
}

export const useFormDataLoader = ({
  selectedBusinessWardId,
  selectedDate,
  selectedShift,
  user,
  reloadDataTrigger
}: UseFormDataLoaderProps): UseFormDataLoaderReturn => {
  const [formData, setFormData] = useState<Partial<WardForm>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isFinalDataFound, setIsFinalDataFound] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  
  const loadingRef = useRef(false);
  const prevSelectionRef = useRef({ ward: selectedBusinessWardId, date: selectedDate });
  const cacheKey = `${selectedBusinessWardId}-${selectedDate}-${selectedShift}`;

  const setCachedData = useCallback((data: Partial<WardForm>, isDraft: boolean = false) => {
    // 🔒 SECURITY FIX: ลบ localStorage persistence เพื่อความปลอดภัย
    // เก็บเฉพาะ in-memory cache ระยะสั้นเท่านั้น
    formDataCache.set(cacheKey, { data, timestamp: Date.now() });
    console.log('[FormDataLoader] Data saved to memory cache only (no localStorage), isDraft:', isDraft);
  }, [cacheKey]);

  const getCachedData = useCallback(() => {
    // 🔒 SECURITY FIX: ใช้เฉพาะ in-memory cache ระยะสั้น (30 วินาที)
    // ไม่ใช้ localStorage เพื่อป้องกันข้อมูลค้างคาว
    const cached = formDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('[FormDataLoader] Using in-memory cache only (30s)');
      return { data: cached.data, isDraft: false }; // ไม่เก็บ isDraft ใน cache
    }
    
    return null;
  }, [cacheKey]);

  const clearCache = useCallback(() => {
    formDataCache.delete(cacheKey);
  }, [cacheKey]);

  const loadData = useCallback(async (forceRefetch = false) => {
    if (!selectedBusinessWardId || !selectedDate || !user?.uid || loadingRef.current) {
      return; 
    }
    
    // 🔒 SECURITY FIX: ใช้ cache เฉพาะ performance เท่านั้น
    // ไม่ใช้ cache เพื่อตัดสินใจ business logic สำคัญ เช่น isDraftLoaded
    if (!forceRefetch) {
      const cachedResult = getCachedData();
      if (cachedResult) {
        console.log('[Security] Using cache for performance only, will verify with Firebase');
        setFormData(cachedResult.data);
        // ไม่ตั้งค่า isDraftLoaded จาก cache - จะโหลดจาก Firebase เสมอ
        setIsFormDirty(false);
        loadingRef.current = false;
        setIsLoading(false);
        // ต้องโหลดจาก Firebase เพื่อยืนยัน draft status
      }
    }
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dateTimestamp = Timestamp.fromDate(targetDate);
      
      const existingForm = await findWardForm({ 
        date: dateTimestamp, 
        shift: selectedShift, 
        wardId: selectedBusinessWardId 
      });
      
      if (existingForm) {
        const isFinal = existingForm.status === FormStatus.FINAL || existingForm.status === FormStatus.APPROVED;
        const loadedData = convertFormDataFromFirebase(existingForm, selectedDate);
        
        if (user && !isFinal) {
          loadedData.recorderFirstName = loadedData.recorderFirstName?.trim() || user.firstName || '';
          loadedData.recorderLastName = loadedData.recorderLastName?.trim() || user.lastName || '';
        }

        const isDraftData = existingForm.status === FormStatus.DRAFT;
        console.log('[Security] Firebase form found - status:', existingForm.status, 'isDraftData:', isDraftData);
        setFormData(loadedData);
        setCachedData(loadedData, isDraftData);
        setIsFinalDataFound(isFinal);
        setIsDraftLoaded(isDraftData);
        
        const isAdminOrDeveloper = user?.role === UserRole.ADMIN || 
                                   user?.role === UserRole.DEVELOPER;
        setIsFormReadOnly(isFinal && !isAdminOrDeveloper);
        
      } else {
        const newData = { ...initialFormStructure };
        
        if (user) {
          newData.recorderFirstName = user.firstName || '';
          newData.recorderLastName = user.lastName || '';
        }

        if (selectedShift === ShiftType.NIGHT) {
          try {
            const morningForm = await findWardForm({
              date: dateTimestamp, 
              shift: ShiftType.MORNING, 
              wardId: selectedBusinessWardId
            });
            if (morningForm && (morningForm.status === FormStatus.FINAL || morningForm.status === FormStatus.APPROVED)) {
              if (morningForm?.patientCensus !== undefined) {
                  newData.patientCensus = morningForm.patientCensus;
              }
            }
          } catch (error) {
            console.error('Could not load morning form for night shift initial census.', error);
          }
        }
        
        setFormData(newData);
        setCachedData(newData, false); // new data ไม่ใช่ draft
        setIsFinalDataFound(false);
        setIsDraftLoaded(false);
        setIsFormReadOnly(false);
      }
      
      setIsFormDirty(false);
      
    } catch (error) {
      console.error('Load data error:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      showErrorToast('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [selectedBusinessWardId, selectedDate, selectedShift, user, getCachedData, setCachedData]);

  useEffect(() => {
    const currentSelection = { ward: selectedBusinessWardId, date: selectedDate };
    const needsReload = JSON.stringify(currentSelection) !== JSON.stringify(prevSelectionRef.current);

    if (needsReload || reloadDataTrigger > 0) {
      prevSelectionRef.current = currentSelection;
      loadData(reloadDataTrigger > 0);
    }
  }, [loadData, selectedBusinessWardId, selectedDate, reloadDataTrigger]);

  // Cleanup cache effect
  useEffect(() => {
    return () => {
      const now = Date.now();
      Array.from(formDataCache.entries()).forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_DURATION) {
          formDataCache.delete(key);
        }
      });
    };
  }, []);

  return {
    formData,
    setFormData,
    isLoading,
    error,
    isFormReadOnly,
    isDraftLoaded,
    isFinalDataFound,
    isFormDirty,
    setIsFormDirty,
    loadData
  };
};

export default useFormDataLoader;