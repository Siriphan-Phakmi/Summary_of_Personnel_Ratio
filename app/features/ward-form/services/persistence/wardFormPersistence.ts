import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { User } from '@/app/features/auth/types/user';
import { formatDateYMD } from '@/app/lib/utils/dateUtils';
import { COLLECTION_WARDFORMS } from '../constants';
import { Logger } from '@/app/lib/utils/logger';
import { clearCache } from '../utils/cacheUtils';
import { checkAndCreateDailySummary } from '../approvalServices/dailySummaryService';
import {
  calculateMorningCensus,
  calculateNightShiftCensus,
  normalizeDateOrThrow,
} from '../wardFormHelpers';
import { getLatestPreviousNightForm } from '../queries/wardFormQueries';
import notificationService from '@/app/features/notifications/services/NotificationService';
import { NotificationType } from '@/app/features/notifications/types';

/**
 * ✅ **Firebase-Safe Data Preparation**
 * กรอง undefined values ออกเพื่อป้องกัน Firebase errors
 */
const sanitizeDataForFirebase = (data: any): any => {
  const sanitized: any = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value === undefined) {
      // ✅ Convert undefined to appropriate default values
      if (['patientCensus', 'admitted', 'discharged', 'transferredIn', 'transferredOut', 
           'deaths', 'onLeave', 'absconded', 'totalBeds', 'availableBeds', 'occupiedBeds',
           'specialCareBeds', 'isolationBeds', 'nurseManager', 'rn', 'pn', 'wc',
           'unavailableBeds', 'plannedDischarge', 'referIn', 'referOut'].includes(key)) {
        sanitized[key] = 0; // Default to 0 for numeric fields
      } else if (['recorderFirstName', 'recorderLastName', 'rejectionReason', 'comment'].includes(key)) {
        sanitized[key] = ''; // Default to empty string for text fields
      }
      // Skip undefined values that don't have defaults
    } else if (value !== null) {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

/**
 * Saves or updates a draft of a ward form.
 * ✅ **FIREBASE ERROR PREVENTION** - กรอง undefined values ก่อนส่งไป Firebase
 */
export const saveDraftWardForm = async (form: WardForm, user: User): Promise<string> => {
  const formRef = doc(db, COLLECTION_WARDFORMS, form.id);
  
  const dataToSave = {
      ...form,
      status: FormStatus.DRAFT,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      // Ensure createdAt is only set once
      createdAt: form.createdAt || serverTimestamp(),
  };
  
  // ✅ **CRITICAL FIX** - กรอง undefined values ออกก่อนส่งไป Firebase
  const sanitizedData = sanitizeDataForFirebase(dataToSave);
  
  await setDoc(formRef, sanitizedData, { merge: true });
  return form.id;
};

/**
 * Finalizes the morning shift form, performing all necessary calculations and saving it.
 * ✅ **FIREBASE ERROR PREVENTION** - กรอง undefined values ก่อนส่งไป Firebase
 */
export const finalizeMorningShiftForm = async (form: WardForm, user: User): Promise<string> => {
    try {
        const dateObj = normalizeDateOrThrow(form.date);
        const dateStr = formatDateYMD(dateObj);
        const wardId = form.wardId;

        const previousNightForm = await getLatestPreviousNightForm(wardId, dateObj);

        const censusCalcs = calculateMorningCensus(previousNightForm, {
            patientCensus: form.patientCensus,
            admitted: form.admitted || 0,
            transferredIn: form.transferredIn || 0,
            discharged: form.discharged || 0,
            transferredOut: form.transferredOut || 0,
            deaths: form.deaths || 0,
        });
        
        const totalBeds = (form.availableBeds || 0) + (form.occupiedBeds || 0);

        const finalData: WardForm = {
            ...form,
            ...censusCalcs,
            totalBeds,
            occupiedBeds: censusCalcs.patientCensus,
            availableBeds: totalBeds - censusCalcs.patientCensus,
            date: dateObj,
            dateString: dateStr,
            status: FormStatus.FINAL,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            createdAt: form.createdAt || serverTimestamp(),
        };

        const formRef = doc(db, COLLECTION_WARDFORMS, form.id);
        
        // ✅ **CRITICAL FIX** - กรอง undefined values ออกก่อนส่งไป Firebase
        const sanitizedFinalData = sanitizeDataForFirebase(finalData);
        
        await setDoc(formRef, sanitizedFinalData, { merge: true });

        const cacheKey = `wardForm-${wardId}-${dateStr}-${ShiftType.MORNING}`;
        clearCache(cacheKey);

        Logger.info(`Form ${form.id} finalized by ${user.uid}`);
        
        // Create notification (don't let it fail the main process)
        try {
            await notificationService.createNotification({
                title: 'Morning Form Submitted',
                message: `Form for ward ${form.wardName} on ${dateStr} has been successfully submitted.`,
                type: NotificationType.APPROVAL_REQUEST,
                recipientIds: [user.uid],
                sender: {
                    id: user.uid,
                    name: user.firstName + ' ' + user.lastName || 'User'
                },
                actionUrl: `/approval?formId=${form.id}`
            });
        } catch (error) {
            Logger.error('Failed to create success notification:', error);
        }

        return form.id;
    } catch (error) {
        Logger.error('Error finalizing morning form:', error);
        
        // Create error notification (don't let it fail further)
        try {
            await notificationService.createNotification({
                title: 'Submission Error',
                message: `Failed to submit morning form for ward ${form.wardName}. Please try again.`,
                type: NotificationType.SYSTEM_ALERT,
                recipientIds: [user.uid],
                sender: {
                    id: 'system',
                    name: 'System'
                },
                actionUrl: `/census/form`
            });
        } catch (notifError) {
            Logger.error('Failed to create error notification:', notifError);
        }
        
        throw error;
    }
};

/**
 * Finalizes the night shift form, performing calculations and saving.
 * ✅ **FIREBASE ERROR PREVENTION** - กรอง undefined values ก่อนส่งไป Firebase
 */
export const finalizeNightShiftForm = async (form: WardForm, morningForm: WardForm, user: User): Promise<string> => {
    try {
        const dateObj = normalizeDateOrThrow(form.date);
        const dateStr = formatDateYMD(dateObj);
        const wardId = form.wardId;

        const censusCalcs = calculateNightShiftCensus(morningForm, {
            admitted: form.admitted || 0,
            transferredIn: form.transferredIn || 0,
            discharged: form.discharged || 0,
            transferredOut: form.transferredOut || 0,
            deaths: form.deaths || 0,
        });

        const totalBeds = (form.availableBeds || 0) + (form.occupiedBeds || 0);

        const finalData: WardForm = {
            ...form,
            ...censusCalcs,
            totalBeds,
            occupiedBeds: censusCalcs.patientCensus,
            availableBeds: totalBeds - censusCalcs.patientCensus,
            date: dateObj,
            dateString: dateStr,
            status: FormStatus.FINAL,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            createdAt: form.createdAt || serverTimestamp(),
        };

        const formRef = doc(db, COLLECTION_WARDFORMS, form.id);
        
        // ✅ **CRITICAL FIX** - กรอง undefined values ออกก่อนส่งไป Firebase
        const sanitizedFinalData = sanitizeDataForFirebase(finalData);
        
        await setDoc(formRef, sanitizedFinalData, { merge: true });

        const cacheKey = `wardForm-${wardId}-${dateStr}-${ShiftType.NIGHT}`;
        clearCache(cacheKey);

        // After successful finalization, trigger the summary creation/update
        if (wardId && form.wardName) {
            await checkAndCreateDailySummary(dateObj, wardId, form.wardName);
        }

        Logger.info(`Form ${form.id} finalized by ${user.uid}`);
        
        // Create notification (don't let it fail the main process)
        try {
            await notificationService.createNotification({
                title: 'Night Form Submitted',
                message: `Form for ward ${form.wardName} on ${dateStr} has been successfully submitted.`,
                type: NotificationType.APPROVAL_REQUEST,
                recipientIds: [user.uid],
                sender: {
                    id: user.uid,
                    name: user.firstName + ' ' + user.lastName || 'User'
                },
                actionUrl: `/approval?formId=${form.id}`
            });
        } catch (error) {
            Logger.error('Failed to create success notification:', error);
        }

        return form.id;
    } catch (error) {
        Logger.error('Error finalizing night form:', error);
        
        // Create error notification (don't let it fail further)
        try {
            await notificationService.createNotification({
                title: 'Submission Error',
                message: `Failed to submit night form for ward ${form.wardName}. Please try again.`,
                type: NotificationType.SYSTEM_ALERT,
                recipientIds: [user.uid],
                sender: {
                    id: 'system',
                    name: 'System'
                },
                actionUrl: `/census/form`
            });
        } catch (notifError) {
            Logger.error('Failed to create error notification:', notifError);
        }
        
        throw error;
    }
}; 