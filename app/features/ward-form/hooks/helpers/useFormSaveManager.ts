'use client';

import { useState, useCallback } from 'react';
import { User, UserRole } from '@/app/features/auth/types/user';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import {
  saveDraftWardForm,
  finalizeMorningShiftForm,
  finalizeNightShiftForm,
  findWardForm,
} from '@/app/features/ward-form/services/wardFormService';
import { showErrorToast, showSuccessToast } from '@/app/lib/utils/toastUtils';
import { logUserAction } from '@/app/features/auth/services/logService';
import { useFormValidation } from './useFormValidation';
import { WardFieldLabels } from '../wardFieldLabels';
import { Timestamp } from 'firebase/firestore';
import notificationService from '@/app/features/notifications/services/NotificationService';
import { NotificationType } from '@/app/features/notifications/types';
import { getAllUsers } from '@/app/features/auth/services/userService';
import { calculatePatientCensusFromOverview } from '../../services/wardFormHelpers';

// Helper function to safely convert date to ISO string
const safeGetDateString = (date: string | Timestamp | Date): string => {
  if (date instanceof Timestamp) {
    return date.toDate().toISOString().split('T')[0];
  }
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date.split('T')[0];
}

export interface UseFormSaveManagerProps {
  formData: Partial<WardForm>;
  selectedBusinessWardId: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  onSaveSuccess: (isFinal: boolean) => void;
}

export interface UseFormSaveManagerReturn {
  isSaving: boolean;
  handleSave: (saveType: 'draft' | 'final') => Promise<void>;
  showConfirmZeroModal: boolean;
  setShowConfirmZeroModal: React.Dispatch<React.SetStateAction<boolean>>;
  fieldsWithValueZero: string[];
  proceedWithSaveAfterZeroConfirmation: () => Promise<void>;
  showConfirmOverwriteModal: boolean;
  setShowConfirmOverwriteModal: React.Dispatch<React.SetStateAction<boolean>>;
  proceedToSaveDraft: () => Promise<void>;
}

export const useFormSaveManager = ({
  formData,
  selectedBusinessWardId,
  selectedDate,
  selectedShift,
  user,
  onSaveSuccess,
}: UseFormSaveManagerProps): UseFormSaveManagerReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmZeroModal, setShowConfirmZeroModal] = useState(false);
  const [fieldsWithValueZero, setFieldsWithValueZero] = useState<string[]>([]);
  const [saveActionType, setSaveActionType] = useState<'draft' | 'final' | null>(null);
  const [showConfirmOverwriteModal, setShowConfirmOverwriteModal] = useState(false);
  const { validateForm } = useFormValidation();

  const createSaveNotification = useCallback(async (
    saveType: 'draft' | 'final',
    form: WardForm,
    actor: User
  ) => {
    try {
      const allUsers = await getAllUsers();
      const adminAndDevIds = allUsers
        .filter(u => u.role === UserRole.ADMIN || u.role === UserRole.DEVELOPER)
        .map(u => u.uid);

      const recipientIds = Array.from(new Set([actor.uid, ...adminAndDevIds]));

      const statusText = saveType === 'draft' ? 'ฉบับร่าง' : 'ฉบับสมบูรณ์';
      const title = `บันทึกฟอร์ม (${statusText})`;
      const message = `คุณ ${actor.firstName} ได้บันทึกข้อมูลเวร${form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'} ของแผนก ${form.wardId} เป็น${statusText}`;

      // สร้าง notification เพียงครั้งเดียวสำหรับ recipients ทั้งหมด
      await notificationService.createNotification({
        recipientIds, // ใช้ recipientIds array แทน recipientId เดี่ยว
        title,
        message,
        type: saveType === 'draft' ? NotificationType.FORM_DRAFT_SAVED : NotificationType.FORM_APPROVED,
        sender: {
          id: actor.uid,
          name: `${actor.firstName} ${actor.lastName}`,
        },
        actionUrl: `/census/approval?wardId=${form.wardId}&date=${safeGetDateString(form.date)}`
      });
    } catch (error) {
      console.error('Failed to create save notification:', error);
      // ไม่แสดง toast error เพราะเป็น optional feature
    }
  }, []);

  const executeSave = useCallback(async (saveType: 'draft' | 'final') => {
    if (!user || !selectedBusinessWardId) {
        showErrorToast('ข้อมูลผู้ใช้หรือแผนกไม่ครบถ้วน ไม่สามารถบันทึกได้');
        return;
    }
      
    try {
      setIsSaving(true);

      // ✅ **FIX: ใช้ Timestamp format เดียวกับการ query**
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dateTimestamp = Timestamp.fromDate(targetDate);

      // 🎯 Auto-calculate Patient Census จากข้อมูลคงเหลือเมื่อบันทึกครั้งแรก
      const enhancedFormData = { ...formData };
      
      // ถ้า Patient Census ยังไม่มีข้อมูล (บันทึกครั้งแรก) ให้คำนวณอัตโนมัติ
      if (!enhancedFormData.patientCensus || enhancedFormData.patientCensus === 0) {
        const autoPatientCensus = calculatePatientCensusFromOverview(enhancedFormData);
        enhancedFormData.patientCensus = autoPatientCensus;
      }

      const formDataToSave: WardForm = {
        ...enhancedFormData,
        id: formData.id || `${selectedBusinessWardId}-${selectedDate}-${selectedShift}`,
        wardId: selectedBusinessWardId,
        shift: selectedShift,
        date: dateTimestamp, // ✅ ใช้ Timestamp แทน Date object
        updatedAt: Timestamp.now(), // ✅ ใช้ Firestore server timestamp
        updatedBy: user?.uid,
      } as WardForm;

      let savedFormId: string;

      if (saveType === 'draft') {
        savedFormId = await saveDraftWardForm(formDataToSave, user);
        showSuccessToast('บันทึกร่างสำเร็จ!');
      } else {
        if (selectedShift === ShiftType.MORNING) {
          savedFormId = await finalizeMorningShiftForm(formDataToSave, user);
        } else { // Night Shift
          const targetDate = new Date(selectedDate + 'T00:00:00');
          const dateTimestamp = Timestamp.fromDate(targetDate);
          
          const morningForm = await findWardForm({
              date: dateTimestamp,
              shift: ShiftType.MORNING,
              wardId: selectedBusinessWardId,
          });

          if (!morningForm || (morningForm.status !== FormStatus.FINAL && morningForm.status !== FormStatus.APPROVED)) {
            throw new Error('กรุณาบันทึกกะเช้าให้สมบูรณ์ก่อนบันทึกกะดึก');
          }

          savedFormId = await finalizeNightShiftForm(formDataToSave, morningForm, user);
        }
        showSuccessToast('บันทึกสมบูรณ์สำเร็จ!');
      }
      
      onSaveSuccess(saveType === 'final');

      // Create notification
      await createSaveNotification(saveType, formDataToSave, user);

      // Only log if user is available
      if (user) {
        await logUserAction(
          user, 
          `FORM.${saveType.toUpperCase()}`, 
          'SUCCESS',
          {
            id: savedFormId,
            type: 'WARD_FORM'
          },
          {
            name: `Form for Ward ${selectedBusinessWardId} on ${selectedDate} (${selectedShift})`,
            wardId: selectedBusinessWardId,
          shift: selectedShift,
          date: selectedDate,
        }
      );
      }

    } catch (error: any) {
      console.error(`Error saving ${saveType}:`, error);
      showErrorToast(error.message || `เกิดข้อผิดพลาดในการบันทึก${saveType === 'draft' ? 'ร่าง' : ''}`);
    } finally {
      setIsSaving(false);
      setShowConfirmZeroModal(false);
      setSaveActionType(null);
    }
  }, [formData, selectedBusinessWardId, selectedShift, selectedDate, user, onSaveSuccess, createSaveNotification]);
  
  const handleSave = useCallback(async (saveType: 'draft' | 'final') => {
    const { isValid, errors, fieldsWithZero } = validateForm(formData, saveType === 'final');
    
    if (!isValid) {
      showErrorToast('กรุณาตรวจสอบข้อมูลและแก้ไขให้ถูกต้อง');
      console.log("Validation Errors:", errors);
      return;
    }

    // ✅ **NEW DRAFT OVERWRITE DETECTION** - Check for existing draft before saving
    if (saveType === 'draft' && selectedBusinessWardId && selectedDate) {
      try {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        const dateTimestamp = Timestamp.fromDate(targetDate);
        
        const existingForm = await findWardForm({
          date: dateTimestamp,
          shift: selectedShift,
          wardId: selectedBusinessWardId,
        });
        
        // If existing draft found, show confirmation modal
        if (existingForm && existingForm.status === FormStatus.DRAFT) {
          setSaveActionType(saveType);
          setShowConfirmOverwriteModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking existing draft:', error);
        // Continue with save if error occurs during check
      }
    }
    
    // Remap field keys to user-friendly labels for the confirmation modal
    const fieldsWithZeroLabels = fieldsWithZero.map(key => WardFieldLabels[key as keyof typeof WardFieldLabels] || key);

    if (fieldsWithZeroLabels.length > 0) {
      setFieldsWithValueZero(fieldsWithZeroLabels);
      setSaveActionType(saveType);
      setShowConfirmZeroModal(true);
      return;
    }

    await executeSave(saveType);
  }, [formData, validateForm, executeSave, selectedBusinessWardId, selectedDate, selectedShift]);

  const proceedWithSaveAfterZeroConfirmation = useCallback(async () => {
    if (saveActionType) {
      await executeSave(saveActionType);
    }
  }, [saveActionType, executeSave]);

  const proceedToSaveDraft = useCallback(async () => {
    setShowConfirmOverwriteModal(false);
    await executeSave('draft');
  }, [executeSave]);

  return {
    isSaving,
    handleSave,
    showConfirmZeroModal,
    setShowConfirmZeroModal,
    fieldsWithValueZero,
    proceedWithSaveAfterZeroConfirmation,
    showConfirmOverwriteModal,
    setShowConfirmOverwriteModal,
    proceedToSaveDraft,
  };
};

export default useFormSaveManager;
