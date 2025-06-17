import { collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { subDays } from 'date-fns';

/**
 * Deletes logs from a specified collection that are older than a given number of days.
 * @param logCollection The name of the log collection (e.g., 'system_logs').
 * @param days The maximum age of logs to keep, in days.
 * @returns The number of deleted log entries.
 */
export const cleanupOldLogs = async (logCollection: string, days: number): Promise<number> => {
  if (days <= 0) {
    throw new Error('จำนวนวันต้องเป็นค่าบวก');
  }

  console.log(`Starting cleanup for "${logCollection}" for logs older than ${days} days...`);

  const cutoffDate = subDays(new Date(), days);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  const logsRef = collection(db, logCollection);
  const q = query(logsRef, where('createdAt', '<', cutoffTimestamp));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('No old logs found to delete.');
    return 0;
  }

  // Firestore allows a maximum of 500 operations in a single batch.
  const batchArray: ReturnType<typeof writeBatch>[] = [];
  batchArray.push(writeBatch(db));
  let operationCounter = 0;
  let batchIndex = 0;

  snapshot.docs.forEach(doc => {
    batchArray[batchIndex].delete(doc.ref);
    operationCounter++;

    if (operationCounter === 499) {
      batchArray.push(writeBatch(db));
      batchIndex++;
      operationCounter = 0;
    }
  });

  await Promise.all(batchArray.map(batch => batch.commit()));
  
  console.log(`Successfully deleted ${snapshot.size} old logs.`);
  return snapshot.size;
}; 