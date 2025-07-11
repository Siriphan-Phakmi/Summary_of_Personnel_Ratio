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
// 🔒 SECURITY FIX: ใช้ Firebase secure draft system แทน localStorage
import {
  loadDraftFromFirebase,
  saveDraftToFirebase,
  isDraftDataFresh,
} from '../../services/persistence/draftPersistence';

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
  saveFormData: (data: Partial<WardForm>, isDraft?: boolean) => Promise<void>; // 🔒 Firebase secure save
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

  const setCachedData = useCallback(async (data: Partial<WardForm>, isDraft: boolean = false) => {
    // 🔒 SECURITY FIX: ใช้ Firebase secure draft system แทน localStorage
    formDataCache.set(cacheKey, { data, timestamp: Date.now() });
    
    // บันทึก draft ลง Firebase หากเป็น draft data
    if (isDraft && selectedBusinessWardId && selectedDate && user) {
      await saveDraftToFirebase(user, selectedBusinessWardId, selectedShift, selectedDate, data);
    }
    console.log('[FormDataLoader] Data saved to memory cache + Firebase draft system, isDraft:', isDraft);
  }, [cacheKey, selectedBusinessWardId, selectedDate, selectedShift, user]);

  const getCachedData = useCallback(async () => {
    // 🔒 SECURITY FIX: เช็ค in-memory cache ก่อน จากนั้นเช็ค Firebase
    const cached = formDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('[FormDataLoader] Using in-memory cache (30s)');
      return { data: cached.data, isDraft: false };
    }
    
    // เช็ค Firebase draft system หาก cache หมดอายุ
    if (selectedBusinessWardId && selectedDate && user) {
      const draftResult = await loadDraftFromFirebase(user, selectedBusinessWardId, selectedShift, selectedDate);
      if (draftResult) {
        console.log('[FormDataLoader] Using Firebase draft system, isDraft:', draftResult.isDraft);
        // อัปเดต in-memory cache
        formDataCache.set(cacheKey, { data: draftResult.data, timestamp: Date.now() });
        return draftResult;
      }
    }
    
    return null;
  }, [cacheKey, selectedBusinessWardId, selectedDate, selectedShift, user]);

  const clearCache = useCallback(() => {
    formDataCache.delete(cacheKey);
  }, [cacheKey]);

  const saveFormData = useCallback(async (data: Partial<WardForm>, isDraft: boolean = false) => {
    if (!selectedBusinessWardId || !selectedDate) return;
    
    await setCachedData(data, isDraft);
    // 🔒 SECURITY NOTE: ตั้งค่า isDraftLoaded จาก Firebase secure system
    setIsDraftLoaded(isDraft);
    setFormData(data);
  }, [selectedBusinessWardId, selectedDate, setCachedData]);

  const loadData = useCallback(async (forceRefetch = false) => {
    if (!selectedBusinessWardId || !selectedDate || !user?.uid || loadingRef.current) {
      return; 
    }
    
    // 🔒 SECURITY FIX: ใช้ Firebase secure system เพื่อ verify draft status
    if (!forceRefetch) {
      const cachedResult = await getCachedData();
      if (cachedResult) {
        console.log('[Security] Using Firebase-verified data, isDraft:', cachedResult.isDraft);
        setFormData(cachedResult.data);
        setIsDraftLoaded(cachedResult.isDraft);
        setIsFinalDataFound(!cachedResult.isDraft);
        // ตั้งค่า read-only status ตาม draft status
        const isAdminOrDeveloper = user?.role === UserRole.ADMIN || user?.role === UserRole.DEVELOPER;
        setIsFormReadOnly(!cachedResult.isDraft ? !isAdminOrDeveloper : false);
        setIsFormDirty(false);
        loadingRef.current = false;
        setIsLoading(false);
        return;
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
        await setCachedData(newData, false); // new data ไม่ใช่ draft - บันทึกใน Firebase
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
    saveFormData, // 🔒 Firebase secure draft system
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