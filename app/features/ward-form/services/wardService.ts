// Main ward service - เป็น entry point สำหรับการจัดการแผนก
// ใช้ helper modules เพื่อลดขนาดไฟล์และเพิ่ม maintainability

// Export query functions
export {
  getAllWards,
  getActiveWards,
  getWardById,
  getWardByCode,
  getWardsByIds
} from './ward-modules/wardQueries';

// Export permission functions
export {
  getWardsByUserPermission,
  getDeveloperWards
} from './ward-modules/wardPermissions';
    
// Export mutation functions
export {
  addWard,
  updateWard,
  deactivateWard,
  updateWardOrders,
  deleteWard,
  setupDefaultWards
} from './ward-modules/wardMutations'; 