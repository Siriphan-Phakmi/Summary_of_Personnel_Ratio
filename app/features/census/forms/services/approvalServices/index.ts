/**
 * Export all approval services ที่แยกไฟล์ย่อย
 */

// ค่าคงที่สำหรับคอลเลกชันใน Firestore
export const COLLECTION_WARDFORMS = 'wardForms';
export const COLLECTION_APPROVALS = 'approvals';
export const COLLECTION_SUMMARIES = 'dailySummaries';

// Export from modules
export * from './approvalForms';
export * from './rejectForms'; 
export * from './dailySummary';
export * from './approvalQueries';
export * from './permissionedQueries'; 