import { Timestamp, FieldValue } from 'firebase/firestore';
import { User } from '@/app/features/auth/types/user';

// =================
// Enums & Basic Types
// =================

/**
 * Represents the server-side timestamp field.
 */
export type ServerTimestamp = {
  _methodName: 'serverTimestamp';
};

/**
 * Represents a field that can be a Firestore Timestamp, a JS Date object,
 * an ISO string, a server timestamp sentinel, or a raw FieldValue.
 */
export type TimestampField = Timestamp | Date | string | ServerTimestamp | FieldValue;

/**
 * Defines the shift types for a ward form.
 */
export enum ShiftType {
  MORNING = 'morning',
  NIGHT = 'night',
}

/**
 * Defines the possible statuses of a ward form.
 */
export enum FormStatus {
  DRAFT = 'draft',
  FINAL = 'final',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// =================
// Main Interfaces
// =================

/**
 * Represents a hospital ward.
 */
export interface Ward {
  id: string;              // Unique identifier for the ward (e.g., 'ICU', 'PED')
  name: string;            // Full name of the ward (e.g., 'Intensive Care Unit')
  description?: string;    // Optional description
  order: number;           // Display order
  isActive: boolean;         // Whether the ward is currently active
  createdAt: Timestamp;    // Timestamp of creation
  updatedAt: Timestamp;    // Timestamp of last update
}

/**
 * Represents the main data structure for the daily census form of a ward.
 */
export interface WardForm {
  id: string;
  wardId: string;
  wardName: string;
  date: Timestamp | Date | string;
  dateString: string;
  shift: ShiftType;
  status: FormStatus;
  isDraft?: boolean;
  
  // Census data
  patientCensus: number;
  admitted: number;
  discharged: number;
  transferredIn: number;
  transferredOut: number;
  deaths: number;
  onLeave: number;
  absconded: number;
  
  // Bed data
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  
  // Specific bed types
  specialCareBeds?: number;
  isolationBeds?: number;
  
  // Recorder info
  recorderFirstName: string;
  recorderLastName: string;

  // Timestamps and user info
  createdAt: TimestampField;
  createdBy: string;
  updatedAt: TimestampField;
  updatedBy: string;

  // Approval info
  approvedAt?: Timestamp;
  approvedBy?: string;
  approverRole?: string;
  approverFirstName?: string;
  approverLastName?: string;
  
  // Rejection info
  rejectionReason?: string;
  rejectedAt?: Timestamp;
  rejectedBy?: string;

  // Summary
  dailySummaryId?: string;
  
  // Approval history
  approvalHistory?: any[]; // Consider defining a specific type for this
}

/**
 * Represents a single approval event within a form's lifecycle.
 * This is intended to be part of an array in the future if multi-level approval is needed.
 */
export interface FormApproval {
  approverId: string;
  approverName: string;
  approvedAt: Timestamp;
  status: 'APPROVED' | 'REJECTED';
  comment?: string;
} 