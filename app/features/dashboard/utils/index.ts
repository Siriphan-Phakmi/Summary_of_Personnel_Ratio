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
} from './dateUtils';

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
export * from './dateUtils';
export * from './loggingUtils'; 