// Export all services except duplicates
export * from './calendarService';

// Export specific functions from dashboardDataService to avoid conflicts
import { refreshData, fetchWardForms } from './dashboardDataService';
export { refreshData, fetchWardForms };

export * from './patientTrendService';
export * from './summaryService';
export * from './wardDataService';

// Export specific functions from wardFormService to avoid naming conflicts
import { getWardFormsByDateAndWard, fetchAllWardCensus } from './wardFormService';
export { getWardFormsByDateAndWard, fetchAllWardCensus };

export * from './wardSummaryService'; 