/**
 * Firebase Collection Cleanup Service
 * ตามหลัก Lean Code: กำจัด Collection ที่ไม่ใช้งาน
 * 
 * @author BPK9 Team
 * @created 2025-01-13
 */

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';

/**
 * Collection ที่ไม่ได้ใช้งานและปลอดภัยที่จะลบ
 */
const UNUSED_COLLECTIONS = [
  'dev_tools_configs' // ชัดเจนว่าไม่ใช้ใน production
] as const;

/**
 * Collection ที่เก็บไว้ก่อน (อาจใช้ในอนาคต)
 */
const RESERVED_COLLECTIONS = [
  'form_configurations',
  'dashboard_configs', 
  'notification_templates',
  'ward_assignments'
] as const;

/**
 * สร้าง Backup Collection ก่อนลบ
 */
export const backupCollectionBeforeDelete = async (
  collectionName: string
): Promise<boolean> => {
  try {
    const sourceRef = collection(db, collectionName);
    const backupRef = collection(db, `archived_${collectionName}`);
    
    const snapshot = await getDocs(sourceRef);
    
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is empty, no backup needed`);
      return true;
    }

    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firebase batch limit

    for (const docSnapshot of snapshot.docs) {
      const backupDocRef = doc(backupRef, docSnapshot.id);
      batch.set(backupDocRef, {
        ...docSnapshot.data(),
        _archivedAt: new Date(),
        _originalCollection: collectionName
      });

      batchCount++;
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Backed up ${snapshot.size} documents from ${collectionName}`);
    return true;

  } catch (error) {
    console.error(`❌ Backup failed for ${collectionName}:`, error);
    return false;
  }
};

/**
 * ลบ Collection ที่ไม่ใช้งาน (ปลอดภัย)
 */
export const deleteUnusedCollection = async (
  collectionName: string
): Promise<boolean> => {
  try {
    // ตรวจสอบว่าอยู่ในรายการที่อนุญาตให้ลบ
    if (!UNUSED_COLLECTIONS.includes(collectionName as any)) {
      throw new Error(`Collection ${collectionName} is not marked as safe to delete`);
    }

    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is already empty`);
      return true;
    }

    // ลบทีละ batch เพื่อป้องกัน timeout
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const docSnapshot of snapshot.docs) {
      batch.delete(docSnapshot.ref);
      batchCount++;
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`🗑️ Deleted ${snapshot.size} documents from ${collectionName}`);
    return true;

  } catch (error) {
    console.error(`❌ Delete failed for ${collectionName}:`, error);
    return false;
  }
};

/**
 * ตรวจสอบ Collection ว่าว่างหรือไม่
 */
export const checkCollectionEmpty = async (
  collectionName: string
): Promise<{ isEmpty: boolean; documentCount: number }> => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return {
      isEmpty: snapshot.empty,
      documentCount: snapshot.size
    };
  } catch (error) {
    console.error(`Error checking collection ${collectionName}:`, error);
    return { isEmpty: true, documentCount: 0 };
  }
};

/**
 * รายงานสถานะ Collection ทั้งหมด
 */
export const generateCollectionReport = async (): Promise<{
  used: Array<{ name: string; count: number }>;
  unused: Array<{ name: string; count: number }>;
  reserved: Array<{ name: string; count: number }>;
}> => {
  const usedCollections = [
    'wardForms', 'wards', 'approvals', 
    'dailySummaries', 'approvalHistory',
    'userDrafts', 'notifications', 'users'
  ];

  const report = {
    used: [] as Array<{ name: string; count: number }>,
    unused: [] as Array<{ name: string; count: number }>,
    reserved: [] as Array<{ name: string; count: number }>
  };

  // ตรวจสอบ Collection ที่ใช้งาน
  for (const collectionName of usedCollections) {
    const { documentCount } = await checkCollectionEmpty(collectionName);
    report.used.push({ name: collectionName, count: documentCount });
  }

  // ตรวจสอบ Collection ที่ไม่ใช้
  for (const collectionName of UNUSED_COLLECTIONS) {
    const { documentCount } = await checkCollectionEmpty(collectionName);
    report.unused.push({ name: collectionName, count: documentCount });
  }

  // ตรวจสอบ Collection ที่เก็บไว้
  for (const collectionName of RESERVED_COLLECTIONS) {
    const { documentCount } = await checkCollectionEmpty(collectionName);
    report.reserved.push({ name: collectionName, count: documentCount });
  }

  return report;
};

/**
 * เรียกใช้งานหลัก: Cleanup ตามหลัก Lean Code
 */
export const performLeanCodeCleanup = async (): Promise<{
  success: boolean;
  report: string[];
}> => {
  const report: string[] = [];
  let allSuccess = true;

  try {
    report.push('🚀 Starting Lean Code Cleanup Process...');

    // สร้างรายงานก่อนลบ
    const beforeReport = await generateCollectionReport();
    report.push(`📊 Collections Report:`);
    report.push(`   Used: ${beforeReport.used.length} collections`);
    report.push(`   Unused: ${beforeReport.unused.length} collections`);
    report.push(`   Reserved: ${beforeReport.reserved.length} collections`);

    // ลบเฉพาะ Collection ที่ชัดเจนว่าไม่ใช้
    for (const collectionName of UNUSED_COLLECTIONS) {
      report.push(`\n🔄 Processing ${collectionName}...`);
      
      // Backup ก่อน
      const backupSuccess = await backupCollectionBeforeDelete(collectionName);
      if (!backupSuccess) {
        report.push(`⚠️ Backup failed for ${collectionName}, skipping delete`);
        allSuccess = false;
        continue;
      }

      // ลบ
      const deleteSuccess = await deleteUnusedCollection(collectionName);
      if (deleteSuccess) {
        report.push(`✅ Successfully cleaned up ${collectionName}`);
      } else {
        report.push(`❌ Failed to clean up ${collectionName}`);
        allSuccess = false;
      }
    }

    report.push(`\n🎉 Lean Code Cleanup ${allSuccess ? 'completed successfully' : 'completed with warnings'}!`);
    
    return { success: allSuccess, report };

  } catch (error) {
    report.push(`💥 Critical error during cleanup: ${error}`);
    return { success: false, report };
  }
};
