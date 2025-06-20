/**
 * Export ฟังก์ชัน utility ทั้งหมดของ dashboard
 */

// นำเข้า utility functions จากไฟล์ต่างๆ
import { 
  getThaiDayName, 
  getThaiMonthName, 
  formatThaiDate, 
  formatShortDate, 
  isDateInRange 
} from '@/app/lib/utils/dateUtils';

import { 
  logInfo, 
  logError, 
  hasAccessToWard 
} from './loggingUtils';

// Export utility functions เพื่อให้เรียกใช้ได้จากที่อื่น
export {
  // Date utilities
  getThaiDayName,
  getThaiMonthName,
  formatThaiDate,
  formatShortDate,
  isDateInRange,
  
  // Logging utilities
  logInfo,
  logError,
  hasAccessToWard
};

// Default export สำหรับการ import ทั้งหมด
export default {
  getThaiDayName,
  getThaiMonthName,
  formatThaiDate,
  formatShortDate,
  isDateInRange,
  logInfo,
  logError,
  hasAccessToWard
};

// Export all utility functions
export * from './dashboardCalculations';
export * from './dashboardUtils';
// dateUtils now imported from shared location
export * from './loggingUtils';
export * from './chartConstants';
export * from './dataAdapters';

// Constants
export const DASHBOARD_WARDS = [
  'ICU', 'CCU', 'SICU', 'MICU', 'PICU', 'NICU', 'ER', 'OR', 'LR', 'OPD',
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B',
  '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B'
]; 