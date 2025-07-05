import { collection, query, where, getDocs, writeBatch, Timestamp, limit, doc } from 'firebase/firestore';
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

  console.log(`🧹 [LOG_CLEANUP] Starting cleanup for "${logCollection}" for logs older than ${days} days...`);

  const cutoffDate = subDays(new Date(), days);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  const logsRef = collection(db, logCollection);
  
  let totalDeleted = 0;

  try {
    // Try new StandardLog structure first (timestamp field)
    const newFormatQuery = query(logsRef, where('timestamp', '<', cutoffTimestamp));
    const newFormatSnapshot = await getDocs(newFormatQuery);
    
    if (!newFormatSnapshot.empty) {
      console.log(`📄 [LOG_CLEANUP] Found ${newFormatSnapshot.size} old logs in new format (timestamp field)`);
      totalDeleted += await deleteBatchedLogs(newFormatSnapshot.docs);
    }
  } catch (error: any) {
    console.log(`⚠️ [LOG_CLEANUP] New format query failed, trying old format: ${error.message}`);
  }

  try {
    // Fallback to old log structure (createdAt field)
    const oldFormatQuery = query(logsRef, where('createdAt', '<', cutoffTimestamp));
    const oldFormatSnapshot = await getDocs(oldFormatQuery);
    
    if (!oldFormatSnapshot.empty) {
      console.log(`📄 [LOG_CLEANUP] Found ${oldFormatSnapshot.size} old logs in old format (createdAt field)`);
      totalDeleted += await deleteBatchedLogs(oldFormatSnapshot.docs);
    }
  } catch (error: any) {
    console.log(`⚠️ [LOG_CLEANUP] Old format query also failed: ${error.message}`);
  }

  if (totalDeleted === 0) {
    console.log('✨ [LOG_CLEANUP] No old logs found to delete.');
    return 0;
  }

  console.log(`✅ [LOG_CLEANUP] Successfully deleted ${totalDeleted} old logs from "${logCollection}".`);
  return totalDeleted;
};

/**
 * Helper function to delete documents in batches (Firebase limit: 500 operations per batch)
 * @param docs Array of documents to delete
 * @returns Number of deleted documents
 */
const deleteBatchedLogs = async (docs: any[]): Promise<number> => {
  if (docs.length === 0) return 0;

  // Firestore allows a maximum of 500 operations in a single batch.
  const batchArray: ReturnType<typeof writeBatch>[] = [];
  batchArray.push(writeBatch(db));
  let operationCounter = 0;
  let batchIndex = 0;

  docs.forEach(doc => {
    batchArray[batchIndex].delete(doc.ref);
    operationCounter++;

    if (operationCounter === 499) {
      batchArray.push(writeBatch(db));
      batchIndex++;
      operationCounter = 0;
    }
  });

  await Promise.all(batchArray.map(batch => batch.commit()));
  return docs.length;
};

/**
 * Deletes ALL logs from a specified collection (DANGER - Developer Only)
 * @param logCollection The name of the log collection
 * @returns The number of deleted log entries
 */
export const deleteAllLogs = async (logCollection: string): Promise<number> => {
  console.log(`🚨 [LOG_DELETE_ALL] DANGER: Starting delete ALL logs from "${logCollection}"...`);

  const logsRef = collection(db, logCollection);
  let totalDeleted = 0;

  try {
    // Get all documents in batches (Firebase query limit)
    let hasMore = true;
    while (hasMore) {
      const batchQuery = query(logsRef, limit(500)); // Process in batches of 500
      const snapshot = await getDocs(batchQuery);
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      const deletedCount = await deleteBatchedLogs(snapshot.docs);
      totalDeleted += deletedCount;
      
      console.log(`🗑️ [LOG_DELETE_ALL] Deleted batch: ${deletedCount} logs (Total: ${totalDeleted})`);
      
      // If we got less than 500, we're done
      if (snapshot.size < 500) {
        hasMore = false;
      }
    }
  } catch (error: any) {
    console.error(`❌ [LOG_DELETE_ALL] Failed to delete all logs from "${logCollection}":`, error);
    throw new Error(`การลบ logs ทั้งหมดล้มเหลว: ${error.message}`);
  }

  console.log(`✅ [LOG_DELETE_ALL] Successfully deleted ALL ${totalDeleted} logs from "${logCollection}".`);
  return totalDeleted;
};

/**
 * Deletes selected logs by their IDs
 * @param logCollection The name of the log collection
 * @param logIds Array of log document IDs to delete
 * @returns The number of deleted log entries
 */
export const deleteSelectedLogs = async (logCollection: string, logIds: string[]): Promise<number> => {
  if (!logIds || logIds.length === 0) {
    throw new Error('ไม่มีรายการที่เลือกสำหรับการลบ');
  }

  console.log(`🗑️ [LOG_DELETE_SELECTED] Starting delete ${logIds.length} selected logs from "${logCollection}"...`);

  const logsRef = collection(db, logCollection);
  let totalDeleted = 0;

  try {
    // Process in batches (Firebase batch limit: 500 operations)
    const batchSize = 500;
    for (let i = 0; i < logIds.length; i += batchSize) {
      const batchIds = logIds.slice(i, i + batchSize);
      const batch = writeBatch(db);
      
      batchIds.forEach(logId => {
        const docRef = doc(logsRef, logId);
        batch.delete(docRef);
      });
      
      await batch.commit();
      totalDeleted += batchIds.length;
      
      console.log(`🗑️ [LOG_DELETE_SELECTED] Deleted batch: ${batchIds.length} logs (Total: ${totalDeleted})`);
    }
  } catch (error: any) {
    console.error(`❌ [LOG_DELETE_SELECTED] Failed to delete selected logs:`, error);
    throw new Error(`การลบ logs ที่เลือกล้มเหลว: ${error.message}`);
  }

  console.log(`✅ [LOG_DELETE_SELECTED] Successfully deleted ${totalDeleted} selected logs from "${logCollection}".`);
  return totalDeleted;
}; 