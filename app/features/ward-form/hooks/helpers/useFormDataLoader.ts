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
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  isLocalStorageDataFresh,
} from './localStorageHelpers';

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
  loadData: () => Promise<void>;
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

  const getCachedData = useCallback(() => {
    // First check in-memory cache
    const cached = formDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('[FormDataLoader] Using in-memory cache');
      return cached.data;
    }
    
    // If in-memory cache is expired or missing, check localStorage
    if (selectedBusinessWardId && selectedDate) {
      if (isLocalStorageDataFresh(selectedBusinessWardId, selectedShift, selectedDate, 60)) { // 60 minutes for localStorage
        const localData = loadFromLocalStorage(selectedBusinessWardId, selectedShift, selectedDate);
        if (localData?.data) {
          console.log('[FormDataLoader] Using localStorage cache');
          // Also update in-memory cache
          setCachedData(localData.data);
          return localData.data;
        }
      }
    }
    
    return null;
  }, [cacheKey, selectedBusinessWardId, selectedDate, selectedShift]);

  const setCachedData = useCallback((data: Partial<WardForm>) => {
    // Save to in-memory cache
    formDataCache.set(cacheKey, { data, timestamp: Date.now() });
    
    // Also save to localStorage for persistence across page visits
    if (selectedBusinessWardId && selectedDate) {
      saveToLocalStorage(selectedBusinessWardId, selectedShift, selectedDate, data);
      console.log('[FormDataLoader] Data saved to both memory and localStorage');
    }
  }, [cacheKey, selectedBusinessWardId, selectedDate, selectedShift]);
  
  const clearCache = useCallback(() => {
    formDataCache.delete(cacheKey);
  }, [cacheKey]);

  const loadData = useCallback(async () => {
    if (!selectedBusinessWardId || !selectedDate || !user?.uid || loadingRef.current) {
      return; 
    }
    
    const cachedData = getCachedData();
    if (cachedData) {
      setFormData(cachedData);
      setIsLoading(false);
      return;
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

        setFormData(loadedData);
        setCachedData(loadedData);
        setIsFinalDataFound(isFinal);
        setIsDraftLoaded(existingForm.status === FormStatus.DRAFT);
        
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
        setCachedData(newData);
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
      loadData();
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