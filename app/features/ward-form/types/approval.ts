import { Timestamp } from 'firebase/firestore';
import { ShiftType, TimestampField } from './ward';
import { UserRole } from '@/app/features/auth/types/user';

/**
 * Represents a summarized record of daily activities for a ward, compiled from
 * both morning and night shift forms. This is the primary data structure for
 * the 'summaries' collection.
 */
export interface DailySummary {
  // --- Identifiers & Core Info ---
  id?: string; // The doc ID, typically `${wardId}_d${YYYYMMDD}`
  wardId: string;
  wardName: string;
  date: Timestamp;
  dateString: string; // 'YYYY-MM-DD'

  // --- Morning Shift Data ---
  morningFormId?: string;
  morningPatientCensus?: number;
  morningAdmitted?: number;
  morningDischarged?: number;
  morningTransferredIn?: number;
  morningTransferredOut?: number;
  morningDeaths?: number;
  morningAbsconded?: number;
  morningOnLeave?: number;
  morningTotalAdmissions?: number; // Sum of admitted, transferredIn
  morningTotalDischarges?: number; // Sum of discharged, transferredOut, deaths, etc.
  
  // --- Night Shift Data ---
  nightFormId?: string;
  nightPatientCensus?: number;
  nightAdmitted?: number;
  nightDischarged?: number;
  nightTransferredIn?: number;
  nightTransferredOut?: number;
  nightDeaths?: number;
  nightAbsconded?: number;
  nightOnLeave?: number;
  nightTotalAdmissions?: number;
  nightTotalDischarges?: number;
  
  // --- 24-Hour Summary Data ---
  dailyPatientCensus?: number; // Usually the night shift's census
  dailyTotalAdmissions?: number;
  dailyTotalDischarges?: number;
  
  // --- Bed & Other Data ---
  totalBeds?: number;
  availableBeds?: number;
  occupiedBeds?: number;

  // --- Status & Timestamps ---
  allFormsApproved: boolean;
  createdAt: TimestampField;
  updatedAt: TimestampField;
  lastUpdatedBy?: string;
  lastUpdatedByName?: string;

  // --- Supervisor Info (for final summary report) ---
  opd24hr?: number;
  oldPatient?: number;
  newPatient?: number;
  admit24hr?: number;
  supervisorFirstName?: string;
  supervisorLastName?: string;
  summaryCompleted?: boolean;
  finalizedAt?: Timestamp;
  finalizedBy?: string;
}

/**
 * Represents a detailed log entry for an action taken on a form (e.g., approve, reject).
 * Stored in the 'approval_history' collection.
 */
export interface ApprovalHistoryRecord {
  id?: string; // Optional document ID
  formId: string;
  wardId: string;
  wardName: string;
  date: Timestamp;
  shift: ShiftType;
  action: 'APPROVED' | 'REJECTED' | 'MODIFIED' | 'SUBMITTED';
  actorUid: string;
  actorName: string;
  timestamp: TimestampField;
  reason?: string; // reason for rejection
}

/**
 * Represents a legacy approval record.
 * This type might be phased out in the future.
 */
export interface ApprovalRecord {
  id: string;
  formId: string;
  approverId: string;
  approverName: string;
  approvedAt: Timestamp;
  // Other fields from the legacy document data can be added here if needed
  [key: string]: any;
}

/**
 * Represents a single event in the approval/rejection history of a form.
 */
export interface ApprovalEvent {
  action: 'approve' | 'reject';
  timestamp: Timestamp;
  userId: string;
  userName: string;
  userRole: UserRole;
  reason?: string; // Only for 'reject' action
}

/**
 * Represents a historical record of an approval or rejection action.
 * This is typically stored in a separate 'approvals' collection.
 */
export interface ApprovalRecord {
  id: string;
  formId: string;
  wardId: string;
  date: Timestamp;
  shift: string;
  action: 'approved' | 'rejected';
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  timestamp: Timestamp;
  reason?: string; // if rejected
  modifiedData?: any; // if data was modified during approval
} 