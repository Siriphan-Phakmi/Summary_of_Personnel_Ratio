import { UserRole } from '../types/user';
import { Timestamp } from 'firebase-admin/firestore';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
  CRITICAL = 'critical',
}

export enum LogType {
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_LOGOUT = 'auth.logout',
  PAGE_ACCESS = 'page.access',
  SYSTEM_ERROR = 'system.error',
  USER_ACTION = 'user.action',
}

export const SYSTEM_LOGS_COLLECTION = 'system_logs';
export const USER_ACTIVITY_LOGS_COLLECTION = 'user_activity_logs';

/**
 * @deprecated Use StandardLog instead.
 */
export interface LogDetails {
  [key: string]: any;
}

/**
 * @deprecated Use StandardLog instead.
 */
export interface LogEntry {
  type: LogType;
  userId: string;
  username: string;
  details: LogDetails;
  createdAt: any; // Firestore ServerTimestamp
  userAgent?: string;
  ipAddress?: string;
  logLevel: LogLevel;
}

// ==================================================================
// V2 Standardized Logging Schema
// ==================================================================

export type ActionStatus = 'SUCCESS' | 'FAILURE' | 'PENDING';

export interface Actor {
  id: string;
  username: string;
  role: UserRole | 'SYSTEM';
  active?: boolean;
  uid?: string;
  ipAddress?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Action {
  type: string; // e.g., 'AUTH.LOGIN', 'FORM.SAVE_DRAFT'
  status: ActionStatus;
}

export interface Target {
  id: string; // Document ID of the target
  type: string; // e.g., 'USER', 'WARD_FORM'
  displayName?: string; // e.g., username, form date + shift
}

export interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'server' | 'unknown';
}

export interface StandardLog {
  timestamp: any; // Should be Firestore FieldValue.serverTimestamp()
  actor: Actor;
  action: Action;
  target?: Target;
  clientInfo?: ClientInfo;
  details?: Record<string, any>;
} 