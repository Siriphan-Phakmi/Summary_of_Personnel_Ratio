import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  limit
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { safeQuery } from '@/app/lib/firebase/firestoreUtils';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { format } from 'date-fns';
import { Logger } from '@/app/lib/utils/logger';

/**
 * Query functions for ward forms with offline error handling
 */

/**
 * ดึงข้อมูลแบบฟอร์มตามวันที่ กะ และแผนก (พร้อม offline handling)
 */
export const getWardFormWithRetry = async (
  date: Timestamp,
  shift: ShiftType,
  wardIdInput: string
): Promise<WardForm | null> => {
  const wardId = wardIdInput.toUpperCase();
  const context = `getWardForm-${wardId}-${shift}`;
  
  Logger.info(`[${context}] Starting query for date=${date?.toDate().toISOString()}, shift=${shift}, wardId=${wardId}`);
  
  try {
    const dateString = format(date.toDate(), 'yyyy-MM-dd');
    
    // สร้าง query object
    const q = query(
      collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('shift', '==', shift),
        where('wardId', '==', wardId),
        orderBy('updatedAt', 'desc'),
        limit(1)
    );

    // ใช้ safeQuery เพื่อจัดการ offline error
    const querySnapshot = await safeQuery(q, context, 3);

    if (querySnapshot && !querySnapshot.empty) {
      const form = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as WardForm;
      Logger.info(`[${context}] Found form with status: ${form.status}`);
      return form;
    }

    Logger.info(`[${context}] No form found`);
    return null;
    
  } catch (error) {
    Logger.error(`[${context}] Error in getWardFormWithRetry:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลฟอร์มของวันก่อนหน้า (กะดึก) สำหรับคำนวณ morning census
 */
export const getLatestPreviousNightFormWithRetry = async (
  date: Date, 
  wardId: string
): Promise<WardForm | null> => {
  const context = `getPreviousNightForm-${wardId}`;
  
  try {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDateString = format(previousDay, 'yyyy-MM-dd');
    
    Logger.info(`[${context}] Looking for night form on ${previousDateString}`);
    
    const q = query(
      collection(db, 'wardForms'),
        where('dateString', '==', previousDateString),
        where('shift', '==', ShiftType.NIGHT),
        where('wardId', '==', wardId.toUpperCase()),
        where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
        orderBy('updatedAt', 'desc'),
        limit(1)
    );

    const querySnapshot = await safeQuery(q, context);

    if (querySnapshot && !querySnapshot.empty) {
      const form = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as WardForm;
      Logger.info(`[${context}] Found previous night form with ${form.patientCensus} patients`);
      return form;
    }

    Logger.info(`[${context}] No previous night form found`);
    return null;
    
  } catch (error) {
    Logger.error(`[${context}] Error getting previous night form:`, error);
    return null; 
  }
};

/**
 * ตรวจสอบสถานะฟอร์มของกะเช้า
 */
export const checkMorningShiftFormStatusWithRetry = async (
  date: Date, 
  wardId: string
): Promise<{
  exists: boolean;
  formId?: string;
  status?: FormStatus;
  isDraft?: boolean;
}> => {
  const context = `checkMorningStatus-${wardId}`;
  
  try {
    const dateString = format(date, 'yyyy-MM-dd');
    
    const q = query(
      collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('shift', '==', ShiftType.MORNING),
        where('wardId', '==', wardId.toUpperCase()),
        orderBy('updatedAt', 'desc'),
        limit(1)
    );

    const querySnapshot = await safeQuery(q, context);

    if (querySnapshot && !querySnapshot.empty) {
      const form = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as WardForm;
      return {
        exists: true,
        formId: form.id,
        status: form.status,
        isDraft: form.isDraft || form.status === FormStatus.DRAFT
      };
    }

    return { exists: false };
    
  } catch (error) {
    Logger.error(`[${context}] Error checking morning shift status:`, error);
    return { exists: false };
  }
};

/**
 * ดึงสถานะของทั้งสองกะในวันที่กำหนด
 */
export const getShiftStatusesForDayWithRetry = async (
  date: Date,
  wardIdInput: string
): Promise<{ morningStatus: FormStatus | null; nightStatus: FormStatus | null }> => {
  const wardId = wardIdInput.toUpperCase();
  const context = `getShiftStatuses-${wardId}`;
  
  try {
    const dateString = format(date, 'yyyy-MM-dd');
    
    Logger.info(`[${context}] Checking statuses for ${dateString}`);
    
    const q = query(
      collection(db, 'wardForms'),
        where('dateString', '==', dateString),
        where('wardId', '==', wardId),
        orderBy('shift', 'asc'),
        orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await safeQuery(q, context);
    const forms = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardForm)) : [];

    let morningStatus: FormStatus | null = null;
    let nightStatus: FormStatus | null = null;

    if (forms.length > 0) {
      const morningForms = forms.filter((f: WardForm) => f.shift === ShiftType.MORNING);
      const nightForms = forms.filter((f: WardForm) => f.shift === ShiftType.NIGHT);

      if (morningForms.length > 0) {
        morningStatus = morningForms[0].status;
      }

      if (nightForms.length > 0) {
        nightStatus = nightForms[0].status;
      }
    }

    Logger.info(`[${context}] Retrieved statuses - Morning: ${morningStatus}, Night: ${nightStatus}`);
    
    return { morningStatus, nightStatus };
    
  } catch (error) {
    Logger.error(`[${context}] Error getting shift statuses:`, error);
    return { morningStatus: null, nightStatus: null };
  }
};

/**
 * ดึงข้อมูลฟอร์มร่างล่าสุดของผู้ใช้
 */
export const getLatestDraftFormWithRetry = async (
  wardId: string,
  userId: string
): Promise<WardForm | null> => {
  const context = `getLatestDraft-${wardId}-${userId}`;
  
  try {
    const q = query(
      collection(db, 'wardForms'),
        where('wardId', '==', wardId.toUpperCase()),
        where('createdBy', '==', userId),
        where('isDraft', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(1)
    );

    const querySnapshot = await safeQuery(q, context);

    if (querySnapshot && !querySnapshot.empty) {
      const form = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as WardForm;
      Logger.info(`[${context}] Found draft form from ${form.updatedAt}`);
      return form;
    }

    Logger.info(`[${context}] No draft form found`);
    return null;
    
  } catch (error) {
    Logger.error(`[${context}] Error getting latest draft:`, error);
    return null;
  }
};

/**
 * ดึงข้อมูลฟอร์มทั้งหมดของแผนกในวันที่กำหนด
 */
export const getWardFormsByWardAndDateWithRetry = async (
  wardId: string,
  date: string
): Promise<WardForm[]> => {
  const context = `getWardFormsByDate-${wardId}`;
  
  try {
    const q = query(
      collection(db, 'wardForms'),
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '==', date),
        orderBy('shift', 'asc'),
        orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await safeQuery(q, context);

    return querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardForm)) : [];
    
  } catch (error) {
    Logger.error(`[${context}] Error getting ward forms by date:`, error);
    return [];
  }
}; 