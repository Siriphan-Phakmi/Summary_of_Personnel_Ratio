/**
 * @file This is the main entry point for all ward form-related services.
 * @description It consolidates and re-exports functions from various specialized modules
 * (persistence, queries, helpers) to provide a single, consistent interface for the
 * rest of the application. This approach, known as a "facade," simplifies imports
 * and decouples UI components from the underlying service architecture.
 */

// --- Persistence Functions ---
// Handles all write operations (save, update, finalize) for ward forms.
export {
  saveDraftWardForm,
  finalizeMorningShiftForm,
  finalizeNightShiftForm,
} from './persistence/wardFormPersistence';

// --- Query Functions ---
// Handles all read operations for ward forms and related data.
export {
  getWardForm,
  findWardForm,
  getLatestPreviousNightForm,
  getShiftStatusesForDay,
  getWardFormsByDateAndWardForDashboard,
  fetchAllWardCensus,
} from './queries/wardFormQueries';

// --- Helper Functions ---
// Provides utility functions for validation, calculation, and data normalization.
export {
  parseDate,
  validateFormData,
  calculateMorningCensus,
  calculateNightShiftCensus,
  generateWardFormId,
  normalizeDateOrThrow,
} from './wardFormHelpers';

// --- Cache Utilities ---
// Manages the in-memory cache for query results to improve performance.
export { getCachedQuery, setCachedQuery, clearCache, clearAllCache } from './utils/cacheUtils';

// --- Constants ---
// Exports shared constant values like collection names.
export {
  COLLECTION_WARDFORMS,
  COLLECTION_WARDS,
  COLLECTION_APPROVALS,
  COLLECTION_SUMMARIES,
} from './constants'; 