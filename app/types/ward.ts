// Define shift types
export type Shift = 'morning' | 'night';

// Define save status types
export type SaveStatus = 'draft' | 'final';

// Define approval status
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// User information for createdBy and approvedBy
export interface UserInfo {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  timestamp?: number;
}

// Define Ward form data structure
export interface WardFormData {
  id?: string; // Document ID
  wardId: string;
  wardName: string;
  date: string;
  shift: Shift;
  status: SaveStatus;
  approvalStatus: ApprovalStatus;
  
  // Patient data
  patientCensus: number;
  nurseManager: number;
  rn: number;
  pn: number;
  wc: number;
  
  // Patient movement
  newAdmit: number;
  transferIn: number;
  referIn: number;
  transferOut: number;
  referOut: number;
  discharge: number;
  dead: number;
  
  // Bed status
  available: number;
  unavailable: number;
  plannedDischarge: number;
  
  // Staff information
  firstName: string;
  lastName: string;
  
  // Optional fields
  comment?: string;
  
  // Metadata
  userId: string;
  userEmail: string;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  submittedAt?: any; // Firestore Timestamp
  lastModified?: number; // Last modified timestamp
  
  // Approval information
  supervisorId?: string;
  supervisorName?: string;
  approvedAt?: any; // Firestore Timestamp
  
  // Edit history
  editHistory?: EditHistoryEntry[];

  // Created By and Approved By information
  createdBy?: UserInfo;
  approvedBy?: UserInfo;

  // Calculated fields
  calculations?: {
    patientCensusCalculated?: number;
    [key: string]: any;
  };
}

// Ward information
export interface Ward {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
}

// User for ward management
export interface WardUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  wards: string[]; // Ward IDs the user has access to
  active: boolean;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  lastLogin?: any;
}

// Edit history entry
export interface EditHistoryEntry {
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  changes: {
    field: string;
    previousValue: any;
    newValue: any;
  }[];
}

// Daily summary (24-hour data)
export interface DailySummary {
  id?: string;
  date: string;
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
  supervisorFirstName?: string;
  supervisorLastName?: string;
  supervisorId?: string;
  supervisorSignature?: {
    firstName: string;
    lastName: string;
    uid: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

// For backward compatibility with existing code
export interface DaySummaryData {
  id?: string;
  date: string;
  wardId: string;
  opd24hr: number;
  oldPatient: number;
  newPatient: number;
  admit24hr: number;
  supervisorFirstName: string;
  supervisorLastName: string;
  supervisorId: string;
  createdAt?: any;
  updatedAt?: any;
}

// Filters for ward forms
export interface WardFormFilters {
  startDate?: string;
  endDate?: string;
  wardId?: string;
  shift?: Shift | 'all';
  approvalStatus?: ApprovalStatus;
  userId?: string;
  limit?: number;
  lastDoc?: any;
}

// Session management
export interface SessionData {
  createdAt: number;
  lastActive: number;
  device: string;
  isActive: boolean;
}

export interface CurrentSession {
  sessionId: string;
  lastActive: number;
} 