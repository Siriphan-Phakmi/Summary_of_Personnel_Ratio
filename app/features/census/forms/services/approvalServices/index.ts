/**
 * Export all approval services ที่แยกไฟล์ย่อย
 */

// นำเข้าค่าคงที่จาก wardFormService แทนการนิยามซ้ำ
import { COLLECTION_WARDFORMS, COLLECTION_WARDS, COLLECTION_APPROVALS, COLLECTION_SUMMARIES } from '../wardFormService';

// Export ค่าคงที่เพื่อให้ไฟล์อื่นๆ ใช้งานได้
export { COLLECTION_WARDFORMS, COLLECTION_APPROVALS, COLLECTION_SUMMARIES };

// เพิ่มค่าคงที่ที่ใช้เฉพาะใน approval services
export const COLLECTION_HISTORY = 'approvalHistory';

// Export from modules
export * from './approvalForms';
export * from './rejectForms'; 
export * from './dailySummary';
export * from './approvalQueries';
export * from './permissionedQueries'; 