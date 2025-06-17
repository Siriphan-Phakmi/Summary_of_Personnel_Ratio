'use client';

import { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';

/**
 * Interface สำหรับ Props ที่ส่งเข้า useWardFormData
 */
export interface UseWardFormDataProps {
  selectedWard: string;
  selectedBusinessWardId: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  reloadDataTrigger: number;
}

/**
 * Interface สำหรับค่าที่ส่งออกจาก useWardFormData
 */
export interface UseWardFormDataReturn {
  formData: Partial<WardForm>;
  errors: Record<string, string>;
  isLoading: boolean;
  isSaving: boolean;
  isFormReadOnly: boolean;
  isCensusAutoCalculated: boolean;
  error: string | null;
  isDraftLoaded: boolean;
  isFinalDataFound: boolean;
  isFormDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  validateForm: (finalSave?: boolean) => boolean;
  handleSaveDraft: () => Promise<void>;
  handleSaveFinal: () => Promise<void>;
  setIsFormReadOnly: Dispatch<SetStateAction<boolean>>;
  showConfirmZeroModal: boolean;
  setShowConfirmZeroModal: Dispatch<SetStateAction<boolean>>;
  fieldsWithValueZero: string[];
  proceedWithSaveAfterZeroConfirmation: () => Promise<void>;
  showConfirmOverwriteModal: boolean;
  setShowConfirmOverwriteModal: Dispatch<SetStateAction<boolean>>;
  proceedToSaveDraft: () => Promise<void>;
  setReloadDataTrigger: Dispatch<SetStateAction<number>>;
} 