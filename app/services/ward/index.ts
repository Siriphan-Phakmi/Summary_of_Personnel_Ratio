/**
 * Re-export all ward-related services 
 * Ward service modules split for better code organization
 */

// Re-export from wardBasic.service.ts
export {
  getAllWards,
  getWardById,
  createWard,
  updateWard
} from './wardBasic.service';

// Re-export from wardForm.service.ts
export {
  getWardFormByDateAndShift,
  getWardFormById,
  getWardFormByDateShift,
  saveWardForm,
  saveWardFormDraft,
  updateWardFormDraft,
  submitWardForm,
  calculatePatientCensus,
  getPreviousWardForm
} from './wardForm.service';

// Re-export from wardApproval.service.ts
export {
  approveWardForm,
  rejectWardForm,
  checkMorningShiftApproved,
  getPendingApprovalForms,
  getWardFormsWithApprovalStatus,
  updateWardFormApprovalStatus,
  editWardFormByAdmin
} from './wardApproval.service';

// Re-export from wardSummary.service.ts
export {
  saveDaySummary,
  getDaySummary,
  saveDailySummary,
  getDailySummaryByDate,
  updateDailySummary
} from './wardSummary.service';

// Re-export from wardQuery.service.ts
export {
  getWardFormsByDateRange,
  getPreviousNightShiftData,
  getWardForms
} from './wardQuery.service'; 