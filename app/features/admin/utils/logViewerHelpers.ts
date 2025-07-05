import { UserRole } from '@/app/features/auth/types/user';
import { ActionStatus } from '@/app/features/auth/types/log';
import { LogEntry, RawLogDocument } from '../types/log';

// เพิ่ม interface สำหรับ UserManagementLog
export interface UserManagementLogDocument {
  action: string;
  adminUid: string;
  adminUsername: string;
  targetUid: string;
  targetUsername: string;
  timestamp: any;
  details?: Record<string, any>;
}

// Helper functions for safe type conversion
export const safeUserRole = (role: string): UserRole | 'SYSTEM' => {
  const validRoles = Object.values(UserRole);
  return validRoles.includes(role as UserRole) ? role as UserRole : 'SYSTEM';
};

export const safeActionStatus = (status: string): ActionStatus => {
  const validStatuses: ActionStatus[] = ['SUCCESS', 'FAILURE', 'PENDING'];
  return validStatuses.includes(status as ActionStatus) ? status as ActionStatus : 'SUCCESS';
};

export const safeDeviceType = (deviceType?: string): 'desktop' | 'mobile' | 'tablet' | 'server' | 'unknown' | undefined => {
  if (!deviceType) return undefined;
  const validTypes = ['desktop', 'mobile', 'tablet', 'server', 'unknown'];
  return validTypes.includes(deviceType) ? deviceType as any : 'unknown';
};

// Log mapping functions
export const mapRawLogToEntry = (doc: any): LogEntry => {
  const data = doc.data() as RawLogDocument;
  
  return {
    id: doc.id,
    timestamp: data.timestamp,
    actor: {
      id: data.actor?.id || 'unknown',
      username: data.actor?.username || 'Unknown',
      role: safeUserRole(data.actor?.role || 'SYSTEM'),
      active: data.actor?.active !== undefined ? data.actor.active : true
    },
    action: {
      type: data.action?.type || 'UNKNOWN',
      status: safeActionStatus(data.action?.status || 'SUCCESS')
    },
    target: data.target,
    clientInfo: data.clientInfo ? {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
      deviceType: safeDeviceType(data.clientInfo.deviceType)
    } : undefined,
    details: data.details,
    // Computed display fields
    displayUsername: data.actor?.username || 'Unknown',
    displayType: data.action?.type || 'Unknown',
    displayTime: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
  };
};

export const mapUserManagementLogToEntry = (doc: any): LogEntry => {
  const data = doc.data() as UserManagementLogDocument;
  
  return {
    id: doc.id,
    timestamp: data.timestamp,
    actor: {
      id: data.adminUid || 'unknown',
      username: data.adminUsername || 'Unknown Admin',
      role: UserRole.ADMIN,
      active: true
    },
    action: {
      type: data.action || 'UNKNOWN',
      status: 'SUCCESS' as ActionStatus
    },
    target: data.targetUid ? {
      id: data.targetUid,
      type: 'USER',
      displayName: data.targetUsername || 'Unknown User'
    } : undefined,
    details: data.details,
    // Computed display fields
    displayUsername: data.adminUsername || 'Unknown Admin',
    displayType: data.action || 'Unknown',
    displayTime: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
  };
}; 