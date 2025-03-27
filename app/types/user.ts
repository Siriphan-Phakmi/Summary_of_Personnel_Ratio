/**
 * User role types
 */
export type UserRole = 'admin' | 'manager' | 'approver' | 'user' | 'guest';

/**
 * Department interface
 */
export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

/**
 * Ward interface for user's assigned wards
 */
export interface AssignedWard {
  id: string;
  name: string;
  role?: 'owner' | 'editor' | 'viewer';
  assignedAt?: number;
}

/**
 * User profile interface
 */
export interface UserProfile {
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  position?: string;
  department?: Department;
  bio?: string;
  assignedWards?: AssignedWard[];
  lastLogin?: number;
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'th';
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

/**
 * User interface extending Firebase User
 */
export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  disabled?: boolean;
  role: UserRole;
  createdAt?: number;
  updatedAt?: number;
  profile?: UserProfile;
  permissions?: string[];
  accountLocked?: boolean;
  lockReason?: string;
  lockExpiresAt?: number;
  failedLoginAttempts?: number;
  lastFailedLogin?: number;
}

/**
 * Create User input interface
 */
export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  department?: Department;
  position?: string;
  assignedWards?: AssignedWard[];
}

/**
 * Update User input interface
 */
export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  department?: Department;
  position?: string;
  assignedWards?: AssignedWard[];
  disabled?: boolean;
  email?: string;
  password?: string;
  accountLocked?: boolean;
  lockExpiresAt?: number;
  failedLoginAttempts?: number;
}
