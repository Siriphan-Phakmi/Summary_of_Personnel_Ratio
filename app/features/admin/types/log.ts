import { Timestamp } from 'firebase/firestore';
import { LogLevel } from '@/app/features/auth/types/log';

export interface LogEntry {
  id: string;
  logLevel?: LogLevel;
  type: string;
  username: string;
  userId: string;
  createdAt: Timestamp;
  details: any; // Can be object or string
  ipAddress?: string;
} 