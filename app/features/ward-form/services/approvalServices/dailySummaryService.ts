import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  Query
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '@/app/lib/firebase/firebase';
import { safeGetDoc, safeQuery } from '@/app/lib/firebase/firestoreUtils';

import { User } from '@/app/features/auth/types/user';
import { DailySummary } from '@/app/features/ward-form/types/approval';
import { FormStatus, WardForm } from '@/app/features/ward-form/types/ward';

import { COLLECTION_SUMMARIES, COLLECTION_WARDFORMS } from '../constants';


// =================================================================
// SECTION: Type Definitions (formerly dailySummaryTypes.ts)
// =================================================================

export type WardFormWithId = WardForm & { id: string };

export interface DailySummaryCreationData {
  wardId: string;
  wardName: string;
  date: Timestamp;
  dateString: string;
  morningForm: WardForm | null;
  nightForm: WardForm | null;
}

export interface SummaryUpdateParams {
  date: Timestamp | Date;
  wardId: string;
  morningForm: WardForm;
  nightForm: WardForm;
  approver: User;
  customData?: Partial<DailySummary>;
}

export interface DateRangeQuery {
  wardId: string;
  startDateString: string;
  endDateString: string;
}

export interface NurseRatioCalculation {
  morningRatio: number;
  nightRatio: number;
  dailyRatio: number;
}

export interface PatientMovementSummary {
  totalAdmissions: number;
  totalDischarges: number;
  netChange: number;
}

// =================================================================
// SECTION: Query Functions (formerly dailySummaryQueries.ts)
// =================================================================

/**
 * Checks if a daily summary document already exists for a given ID.
 * @param summaryId The unique identifier for the summary document.
 * @returns True if the summary exists, false otherwise.
 */
export const checkExistingSummary = async (summaryId: string): Promise<boolean> => {
  try {
    const summaryRef = doc(db, COLLECTION_SUMMARIES, summaryId);
    const summarySnapshot = await getDoc(summaryRef);
    return summarySnapshot.exists();
  } catch (error) {
    console.error(`[checkExistingSummary] Error:`, error);
    return false;
  }
};

/**
 * Fetches the most recently approved form for a specific ward, date, and shift.
 * @param dateString The date in 'YYYY-MM-DD' format.
 * @param wardId The ID of the ward.
 * @param shift The shift ('morning' or 'night').
 * @returns The approved WardForm object or null if not found.
 */
export const getLastApprovedFormForShift = async (
  dateString: string,
  wardId: string,
  shift: 'morning' | 'night'
): Promise<WardForm | null> => {
  try {
    const formsQuery = query(
      collection(db, COLLECTION_WARDFORMS),
      where('wardId', '==', wardId),
      where('dateString', '==', dateString),
      where('shift', '==', shift),
      where('status', '==', FormStatus.APPROVED),
      orderBy('updatedAt', 'desc'),
      limit(1)
    ) as Query<WardForm>;

    const snapshot = await safeQuery(
      formsQuery,
      `getLastApprovedFormForShift-${shift}-${wardId}-${dateString}`
    );
    const forms = snapshot ? snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) : [];
    return (forms && forms.length > 0) ? forms[0] : null;
  } catch (error) {
    console.error(`[getLastApprovedFormForShift] Error fetching ${shift} form:`, error);
    return null;
  }
};

/**
 * Retrieves both the morning and night shift approved forms for a specific date and ward.
 * @param wardId The ID of the ward.
 * @param dateString The date in 'YYYY-MM-DD' format.
 * @returns An object containing the morning and night forms, which may be null.
 */
export const getShiftFormsForDate = async (
  wardId: string,
  dateString: string
): Promise<{ morningForm: WardForm | null; nightForm: WardForm | null }> => {
  try {
    const [morningForm, nightForm] = await Promise.all([
      getLastApprovedFormForShift(dateString, wardId, 'morning'),
      getLastApprovedFormForShift(dateString, wardId, 'night'),
    ]);
    return { morningForm, nightForm };
  } catch (error) {
    console.error('[getShiftFormsForDate] Error:', error);
    return { morningForm: null, nightForm: null };
  }
};


// =================================================================
// SECTION: Calculation Functions (formerly dailySummaryCalculations.ts)
// =================================================================

const calculateAdmitTotal = (form: WardForm | null): number => {
  if (!form) return 0;
  return (form.admitted || 0) + (form.transferredIn || 0);
};

const calculateDischargeTotal = (form: WardForm | null): number => {
  if (!form) return 0;
  return (form.discharged || 0) + (form.transferredOut || 0) + (form.deaths || 0);
};

/**
 * Creates the complete DailySummary object from form data.
 * @param data The data required to build the summary.
 * @returns A complete DailySummary object.
 */
export const createDailySummaryData = ({
  wardId,
  wardName,
  date,
  dateString,
  morningForm,
  nightForm,
}: DailySummaryCreationData): DailySummary => {
    const allFormsApproved = !!(morningForm && nightForm);
    const morningTotalAdmissions = calculateAdmitTotal(morningForm);
    const nightTotalAdmissions = calculateAdmitTotal(nightForm);
    const morningTotalDischarges = calculateDischargeTotal(morningForm);
    const nightTotalDischarges = calculateDischargeTotal(nightForm);

    return {
        wardId,
        wardName,
        date,
        dateString,
        
        // Morning Shift Data
        morningFormId: morningForm?.id,
        morningPatientCensus: morningForm?.patientCensus,
        morningAdmitted: morningForm?.admitted,
        morningDischarged: morningForm?.discharged,
        morningTransferredIn: morningForm?.transferredIn,
        morningTransferredOut: morningForm?.transferredOut,
        morningDeaths: morningForm?.deaths,
        morningAbsconded: morningForm?.absconded,
        morningOnLeave: morningForm?.onLeave,
        morningTotalAdmissions,
        morningTotalDischarges,

        // Night Shift Data
        nightFormId: nightForm?.id,
        nightPatientCensus: nightForm?.patientCensus,
        nightAdmitted: nightForm?.admitted,
        nightDischarged: nightForm?.discharged,
        nightTransferredIn: nightForm?.transferredIn,
        nightTransferredOut: nightForm?.transferredOut,
        nightDeaths: nightForm?.deaths,
        nightAbsconded: nightForm?.absconded,
        nightOnLeave: nightForm?.onLeave,
        nightTotalAdmissions,
        nightTotalDischarges,
      
        // 24-Hour Summary Data
        dailyPatientCensus: nightForm?.patientCensus ?? morningForm?.patientCensus,
        dailyTotalAdmissions: morningTotalAdmissions + nightTotalAdmissions,
        dailyTotalDischarges: morningTotalDischarges + nightTotalDischarges,
        
        // Bed Data
        totalBeds: nightForm?.totalBeds ?? morningForm?.totalBeds,
        availableBeds: nightForm?.availableBeds ?? morningForm?.availableBeds,
        occupiedBeds: nightForm?.occupiedBeds ?? morningForm?.occupiedBeds,

        // Approval & Timestamps
        allFormsApproved,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
};

// =================================================================
// SECTION: Core Logic (formerly in dailySummary.ts and calculations)
// =================================================================

/**
 * Checks if a daily summary needs to be created for a given date and ward, and if so, creates it.
 * This is the primary entry point after a form is approved.
 * @param date The date of the approved form (can be Timestamp, Date, or string).
 * @param wardId The ID of the ward.
 * @param wardName The name of the ward.
 */
export const checkAndCreateDailySummary = async (
  date: unknown,
  wardId: string,
  wardName: string
): Promise<void> => {
  try {
    let formDate: Date;
    if (date instanceof Timestamp) {
        formDate = date.toDate();
    } else if (date instanceof Date) {
        formDate = date;
    } else if (typeof date === 'string') {
        formDate = new Date(date);
    } else {
        console.error('[checkAndCreateDailySummary] Invalid date type:', date);
        return;
    }

    const dateString = format(formDate, 'yyyy-MM-dd');
    const summaryId = `${wardId}_d${format(formDate, 'yyyyMMdd')}`;
    
    const summaryExists = await checkExistingSummary(summaryId);

    // Fetch forms regardless of summary existence to ensure we have the latest approved data
    const { morningForm, nightForm } = await getShiftFormsForDate(wardId, dateString);

    // We proceed if either a new form has been approved (requiring an update) 
    // or if the summary doesn't exist yet and we have at least one form.
    if (summaryExists || morningForm || nightForm) {
        const summaryData = createDailySummaryData({
            wardId,
            wardName,
            date: Timestamp.fromDate(formDate),
            dateString,
            morningForm,
            nightForm,
        });

        const summaryRef = doc(db, COLLECTION_SUMMARIES, summaryId);
        
        if (summaryExists) {
            // If it exists, update it with the new data
            await updateDoc(summaryRef, { ...summaryData, updatedAt: Timestamp.now() });
            console.log(`[checkAndCreateDailySummary] Updated summary ${summaryId}`);
        } else {
            // If it doesn't exist, create it
            await setDoc(summaryRef, summaryData);
            console.log(`[checkAndCreateDailySummary] Created summary ${summaryId}`);
        }
    }

  } catch (error)
 {
    console.error('[checkAndCreateDailySummary] Error:', error);
    // Avoid throwing error to prevent halting the approval process
  }
}; 