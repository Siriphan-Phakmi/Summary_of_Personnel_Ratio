import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  Query,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';
import { startOfDay, subDays, format } from 'date-fns';
import { COLLECTION_WARDFORMS, COLLECTION_WARDS } from '../constants';
import { safeQuery } from '@/app/lib/firebase/firestoreUtils';
import { getCachedQuery, setCachedQuery } from '../utils/cacheUtils';
import { Logger } from '@/app/lib/utils/logger';
import { 
  COLLECTION_APPROVALS, 
  COLLECTION_SUMMARIES 
} from '../constants';

/**
 * Finds a single ward form based on date, shift, and ward ID.
 * This is the primary query function for retrieving a specific form entry.
 *
 * @param {object} params - The query parameters.
 * @param {Timestamp} params.date - The Firestore Timestamp for the start of the day.
 * @param {ShiftType} params.shift - The shift (morning or night).
 * @param {string} params.wardId - The ID of the ward.
 * @returns {Promise<WardForm | null>} The found form data or null.
 */
export const findWardForm = async ({
  date,
  shift,
  wardId,
}: {
  date: Timestamp;
  shift: ShiftType;
  wardId: string;
}): Promise<WardForm | null> => {
  const cacheKey = `wardform-${wardId}-${date.toMillis()}-${shift}`;
  const cached = getCachedQuery<WardForm>(cacheKey);
  if (cached) {
    Logger.info(`[findWardForm] Cache hit for key: ${cacheKey}`);
    return cached;
  }
  
  Logger.info(`[findWardForm] Cache miss, querying Firestore for:`, { wardId, shift });

  const formsQuery = query(
    collection(db, COLLECTION_WARDFORMS),
    where('wardId', '==', wardId),
    where('date', '==', date),
    where('shift', '==', shift),
    limit(1)
  ) as Query<WardForm>;

  const snapshot = await safeQuery(
    formsQuery,
    cacheKey // Pass cacheKey to safeQuery for consistency
  );

  const forms = snapshot ? snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) : [];
  const result = (forms && forms.length > 0) ? forms[0] : null;
  if (result) {
    setCachedQuery(cacheKey, result);
  }
  return result;
};

/**
 * Fetches a single ward form by its ID from Firestore.
 */
export const getWardForm = async (
  formId: string
): Promise<WardForm | null> => {
    const docRef = doc(db, COLLECTION_WARDFORMS, formId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as WardForm;
    }
    return null;
}

/**
 * Gets the latest approved night shift form from the previous day.
 */
export const getLatestPreviousNightForm = async (
  wardId: string,
  currentDate: Date
): Promise<WardForm | null> => {
  const previousDay = subDays(currentDate, 1);
  const dateString = format(previousDay, 'yyyy-MM-dd');

  const formsQuery = query(
    collection(db, COLLECTION_WARDFORMS),
    where('wardId', '==', wardId),
    where('dateString', '==', dateString),
    where('shift', '==', ShiftType.NIGHT),
    where('status', '==', FormStatus.APPROVED),
    orderBy('updatedAt', 'desc'),
    limit(1)
  ) as Query<WardForm>;

  const snapshot = await safeQuery(
    formsQuery,
    `latest-prev-night-${wardId}-${dateString}`
  );
  
  const forms = snapshot ? snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) : [];
  return (forms && forms.length > 0) ? forms[0] : null;
};

/**
 * Gets the status of both shifts for a given day and ward.
 */
export const getShiftStatusesForDay = async (
  wardId: string,
  date: Date
): Promise<{ morning: FormStatus | null; night: FormStatus | null }> => {
    const dateString = format(date, 'yyyy-MM-dd');
    const q = query(
        collection(db, COLLECTION_WARDFORMS),
        where('wardId', '==', wardId),
        where('dateString', '==', dateString)
    );
    const querySnapshot = await getDocs(q);
    const forms = querySnapshot.docs.map(doc => doc.data() as WardForm);

    const morningForm = forms.find(form => form.shift === ShiftType.MORNING);
    const nightForm = forms.find(form => form.shift === ShiftType.NIGHT);

    return {
        morning: morningForm ? morningForm.status : null,
        night: nightForm ? nightForm.status : null,
    };
}

/**
 * Fetches all ward forms for a specific date and ward, for dashboard use.
 */
export const getWardFormsByDateAndWardForDashboard = async (
  date: Date,
  wardId: string
): Promise<WardForm[]> => {
    const dateString = format(date, 'yyyy-MM-dd');
    const formsQuery = query(
        collection(db, COLLECTION_WARDFORMS),
        where('wardId', '==', wardId),
        where('dateString', '==', dateString),
        orderBy('shift', 'asc')
    ) as Query<WardForm>;

    const snapshot = await safeQuery(
        formsQuery,
        `dashboard-forms-${wardId}-${dateString}`
    );
    const forms = snapshot ? snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) : [];
    return forms || [];
}

/**
 * Fetches the latest census data for all wards.
 */
export const fetchAllWardCensus = async (): Promise<any[]> => {
    // This query is complex and might need a dedicated backend solution or aggregation.
    // The original implementation was flawed. A simplified version is provided here.
    // This fetches all wards first, then gets the latest form for each. This is inefficient.
    const wardsSnapshot = await getDocs(collection(db, COLLECTION_WARDS));
    const wardIds = wardsSnapshot.docs.map(doc => doc.id);

    const censusData = await Promise.all(
        wardIds.map(async (wardId) => {
            const q = query(
                collection(db, COLLECTION_WARDFORMS),
                where('wardId', '==', wardId),
                orderBy('date', 'desc'),
                limit(1)
            );
            const formSnapshot = await getDocs(q);
            if (!formSnapshot.empty) {
                return formSnapshot.docs[0].data();
            }
            return { wardId, patientCensus: 0, date: null };
        })
    );
    return censusData;
} 