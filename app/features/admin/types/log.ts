import { Timestamp } from 'firebase/firestore';
import { StandardLog, LogLevel } from '@/app/features/auth/types/log';

// Re-export StandardLog as LogEntry for backward compatibility
export type LogEntry = StandardLog & {
  id: string;
  // Additional computed fields for admin display
  displayUsername?: string;
  displayType?: string;
  displayTime?: string;
};

// Helper type for raw Firebase document
export interface RawLogDocument {
  id: string;
  timestamp: any;
  actor: {
    id: string;
    username: string;
    role: string;
    active?: boolean;
  };
  action: {
    type: string;
    status: string;
  };
  target?: {
    id: string;
    type: string;
    displayName?: string;
  };
  clientInfo?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
  };
  details?: Record<string, any>;
} 