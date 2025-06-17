import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Query,
  DocumentReference,
  QueryConstraint,
  FirestoreError,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleIndexError } from './indexDetector';
import { Logger } from '../utils/logger';

const DEFAULT_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Executes a Firestore query with an exponential backoff retry mechanism.
 * This is useful for handling transient network errors or "client-offline" issues.
 *
 * @param queryToExecute The Firestore Query object to execute.
 * @param context A string for logging purposes to identify the caller.
 * @param maxAttempts The maximum number of retry attempts.
 * @returns A Promise that resolves with the QuerySnapshot on success, or null on failure after all retries.
 */
export async function safeQuery<T>(
  queryToExecute: Query<T>,
  context: string,
  maxAttempts: number = DEFAULT_RETRY_ATTEMPTS
): Promise<QuerySnapshot<T> | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const querySnapshot = await getDocs(queryToExecute);
      Logger.info(`[${context}] Query successful on attempt ${attempt}`);
      return querySnapshot;
    } catch (error: any) {
      handleIndexError(error, context);
      const isOfflineError = error.code === 'unavailable' || error.message.includes('client-offline');
      if (isOfflineError && attempt < maxAttempts) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        Logger.warn(
          `[${context}] Query failed on attempt ${attempt} due to offline state. Retrying in ${delay}ms...`,
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        Logger.error(`[${context}] Query failed permanently after ${attempt} attempts.`, error);
        // Do not re-throw non-retryable errors, just return null
      return null;
    }
    }
  }
  return null;
}

/**
 * Fetches a single Firestore document with an exponential backoff retry mechanism.
 *
 * @param docRef The DocumentReference of the document to fetch.
 * @param context A string for logging purposes.
 * @param maxAttempts The maximum number of retry attempts.
 * @returns A Promise that resolves with the DocumentSnapshot on success, or null on failure.
 */
export async function safeGetDoc<T>(
  docRef: DocumentReference<T>,
  context: string,
  maxAttempts: number = DEFAULT_RETRY_ATTEMPTS
): Promise<DocumentSnapshot<T> | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    const docSnap = await getDoc(docRef);
            Logger.info(`[${context}] Get document successful on attempt ${attempt}`);
            return docSnap;
        } catch (error: any) {
            const isOfflineError = error.code === 'unavailable' || error.message.includes('client-offline');
            if (isOfflineError && attempt < maxAttempts) {
                const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
                Logger.warn(
                    `[${context}] Get document failed on attempt ${attempt} due to offline state. Retrying in ${delay}ms...`,
                    error.message
                );
                await new Promise(resolve => setTimeout(resolve, delay));
    } else {
                Logger.error(`[${context}] Get document failed permanently after ${attempt} attempts.`, error);
                // Return null instead of throwing
      return null;
            }
        }
    }
    return null;
} 