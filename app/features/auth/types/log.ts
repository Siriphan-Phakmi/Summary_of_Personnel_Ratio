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

export interface LogDetails {
  page?: string;
  deviceType?: string;
  browserName?: string;
  reason?: string;
  errorMessage?: string;
  role?: string;
  action?: string;
  [key: string]: any;
}

export interface LogEntry {
  id: string;
  type: LogType | string;
  userId?: string;
  username: string;
  details: LogDetails;
  userAgent?: string;
  ipAddress?: string;
  logLevel?: LogLevel;
  createdAt: any; // Firestore Timestamp
}

export const SYSTEM_LOGS_COLLECTION = 'system_logs';
export const USER_ACTIVITY_LOGS_COLLECTION = 'user_activity_logs'; 