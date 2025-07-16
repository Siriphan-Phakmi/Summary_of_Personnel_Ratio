// Main ward service - เป็น entry point สำหรับการจัดการแผนก
// ใช้ helper modules เพื่อลดขนาดไฟล์และเพิ่ม maintainability

// Export query functions
export {
  getAllWards,
  getActiveWards,
  getWardById,
  getWardByCode,
  getWardsByIds,
  findWardBySimilarCode
} from './ward-modules/wardQueries';

// Export permission functions
export {
  getWardsByUserPermission,
  getDeveloperWards,
  getUserAccessibleWards
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

// Export user setup functions
export {
  checkUserWardAssignment
} from './ward-modules/wardUserSetup'; 