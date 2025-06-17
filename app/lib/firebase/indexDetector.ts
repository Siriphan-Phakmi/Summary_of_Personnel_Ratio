import { FirestoreError } from 'firebase/firestore';
import { Logger } from '../utils/logger';

/**
 * Checks if a Firestore error is due to a missing index and logs a helpful message if it is.
 * @param error The FirestoreError object from a catch block.
 * @param queryId A unique identifier for the query that failed, used for logging.
 * @returns True if the error was a missing index error and was handled, false otherwise.
 */
export function handleIndexError(error: FirestoreError, queryId: string): boolean {
  // Firestore's error code for a failed precondition, which often indicates a missing index.
  const MISSING_INDEX_CODE = 'failed-precondition';

  if (error.code === MISSING_INDEX_CODE && error.message.includes('index')) {
    // This is likely a missing index error. Log a detailed message to help developers.
    try {
      // The error message from Firestore usually contains the direct link to create the index.
      // We try to extract it.
      const urlMatch = error.message.match(/https?:\/\/[^\s]+/);
      const indexCreationUrl = urlMatch ? urlMatch[0] : 'not found';

      Logger.error('--- Firestore Index Error ---');
      Logger.error(`Query [${queryId}] failed because of a missing Firestore index.`);
      Logger.error('To fix this, create the required composite index in your Firebase console.');
      Logger.error(`URL for creating the index: ${indexCreationUrl}`);
      Logger.error('-----------------------------');
      
      // Return true to indicate that we've identified and handled this specific error.
      return true;
    } catch (logError) {
      // If logging itself fails, log the original error.
      Logger.error('Error in handleIndexError while trying to log a missing index:', error);
      return false;
    }
  }

  // If it's not a missing index error, return false so it can be handled by other logic.
  return false;
} 