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
import { db } from '@/app/core/firebase/firebase';
import { safeQuery, safeGetDoc } from '@/app/core/firebase/firestoreUtils';
import { WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { format } from 'date-fns';
import { Logger } from '@/app/core/utils/logger';
import { 
  COLLECTION_WARDFORMS, 
  COLLECTION_WARDS 
} from './constants';

/**
 * ดึงข้อมูลแบบฟอร์มร่างล่าสุดของผู้ใช้ (พร้อม offline handling)
 */
export const getLatestDraftFormWithOfflineHandling = async (
  wardId: string,
  userId: string
): Promise<WardForm | null> => {
  const context = `getLatestDraftForm-${wardId}-${userId}`;
  
  try {
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('wardId', '==', wardId.toUpperCase()),
        where('createdBy', '==', userId),
        where('isDraft', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(1)
      ],
      context
    );

    if (forms && forms.length > 0) {
      Logger.info(`[${context}] Found draft form from ${forms[0].updatedAt}`);
      return forms[0];
    }

    Logger.info(`[${context}] No draft form found`);
    return null;
    
  } catch (error) {
    Logger.error(`[${context}] Error getting latest draft:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลฟอร์มทั้งหมดของแผนกในวันที่กำหนด (พร้อม offline handling)
 */
export const getWardFormsByWardAndDateWithOfflineHandling = async (
  wardId: string,
  date: string
): Promise<WardForm[]> => {
  const context = `getWardFormsByDate-${wardId}`;
  
  try {
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '==', date),
        orderBy('shift', 'asc'),
        orderBy('updatedAt', 'desc')
      ],
      context
    );

    return forms || [];
    
  } catch (error) {
    Logger.error(`[${context}] Error getting ward forms by date:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลฟอร์มของวันก่อนหน้า (พร้อม offline handling)
 */
export const getPreviousDayLastFormWithOfflineHandling = async (
  wardId: string,
  date: string
): Promise<WardForm | null> => {
  const context = `getPreviousDayLastForm-${wardId}`;
  
  try {
    // Parse the input date
    const currentDate = new Date(date);
    
    // Get the previous day by subtracting one day
    const previousDay = new Date(currentDate);
    previousDay.setDate(currentDate.getDate() - 1);
    
    // Format as YYYY-MM-DD string  
    const previousDateString = format(previousDay, 'yyyy-MM-dd');
    
    Logger.info(`[${context}] Looking for forms on previous day: ${previousDateString}`);
    
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '==', previousDateString),
        where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
        orderBy('updatedAt', 'desc'),
        limit(1)
      ],
      context
    );

    if (forms && forms.length > 0) {
      Logger.info(`[${context}] Found previous day form: ${forms[0].shift} shift with status ${forms[0].status}`);
      return forms[0];
    }

    Logger.info(`[${context}] No previous day form found`);
    return null;
    
  } catch (error) {
    Logger.error(`[${context}] Error getting previous day form:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสรุปสำหรับแผนก (พร้อม offline handling)
 */
export const getSummaryForWardWithOfflineHandling = async (
  date: Date, 
  wardId: string
): Promise<{
  morningForm: WardForm | null;
  nightForm: WardForm | null;
}> => {
  const context = `getSummaryForWard-${wardId}`;
  const dateString = format(date, 'yyyy-MM-dd');
  
  try {
    Logger.info(`[${context}] Getting summary for ward ${wardId} on ${dateString}`);
    
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '==', dateString),
        where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
        orderBy('shift', 'asc'),
        orderBy('updatedAt', 'desc')
      ],
      context
    );

    let morningForm: WardForm | null = null;
    let nightForm: WardForm | null = null;

    if (forms) {
      // Find the latest morning and night forms
      forms.forEach(form => {
        if (form.shift === ShiftType.MORNING && !morningForm) {
          morningForm = form;
        } else if (form.shift === ShiftType.NIGHT && !nightForm) {
          nightForm = form;
        }
      });
    }

    Logger.info(`[${context}] Found - Morning: ${!!morningForm}, Night: ${!!nightForm}`);
    
    return {
      morningForm,
      nightForm
    };
    
  } catch (error) {
    Logger.error(`[${context}] Error getting summary:`, error);
    throw error;
  }
};

/**
 * ดึงข้อมูลสำหรับแดชบอร์ด (พร้อม offline handling)
 */
export const getWardFormsByDateAndWardForDashboardWithOfflineHandling = async (
  wardId: string, 
  dateString: string
): Promise<{ morning: WardForm | null, night: WardForm | null }> => {
  const context = `getDashboardForms-${wardId}`;
  
  try {
    Logger.info(`[${context}] Getting forms for dashboard - Ward: ${wardId}, Date: ${dateString}`);
    
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('wardId', '==', wardId.toUpperCase()),
        where('dateString', '==', dateString),
        where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
        orderBy('updatedAt', 'desc')
      ],
      context
    );

    let morningForm: WardForm | null = null;
    let nightForm: WardForm | null = null;

    if (forms) {
      forms.forEach(form => {
        if (form.shift === ShiftType.MORNING && !morningForm) {
          morningForm = form;
        } else if (form.shift === ShiftType.NIGHT && !nightForm) {
          nightForm = form;
        }
      });
    }

    Logger.info(`[${context}] Dashboard data retrieved - Morning: ${!!morningForm}, Night: ${!!nightForm}`);

    return {
      morning: morningForm,
      night: nightForm
    };
    
  } catch (error) {
    Logger.error(`[${context}] Error getting dashboard forms:`, error);
    throw error;
  }
};

/**
 * ดึงจำนวนผู้ป่วยทั้งหมดในวันที่กำหนด (พร้อม offline handling)
 */
export const fetchAllWardCensusWithOfflineHandling = async (
  dateString: string
): Promise<Map<string, number>> => {
  const context = `fetchAllWardCensus`;
  const censusMap = new Map<string, number>();
  
  try {
    Logger.info(`[${context}] Fetching all ward census for date: ${dateString}`);
    
    // ใช้ safeQuery เพื่อจัดการ offline error
    const forms = await safeQuery<WardForm>(
      COLLECTION_WARDFORMS,
      [
        where('dateString', '==', dateString),
        where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
        orderBy('updatedAt', 'desc')
      ],
      context
    );

    if (forms) {
      // Create a map to store the latest form for each ward
      const latestForms = new Map<string, WardForm>();

      forms.forEach(form => {
        const key = `${form.wardId}_${form.shift}`;
        if (!latestForms.has(key)) {
          latestForms.set(key, form);
        }
      });

      // Extract patient census from the latest forms
      latestForms.forEach(form => {
        if (form.patientCensus !== undefined && form.patientCensus !== null) {
          censusMap.set(form.wardId, form.patientCensus);
        }
      });
    }

    Logger.info(`[${context}] Census data retrieved for ${censusMap.size} wards`);
    return censusMap;
    
  } catch (error) {
    Logger.error(`[${context}] Error fetching ward census:`, error);
    throw error;
  }
}; 