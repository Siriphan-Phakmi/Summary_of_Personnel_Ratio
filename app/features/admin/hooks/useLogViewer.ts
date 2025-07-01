'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { useAuth } from '@/app/features/auth';
import { subDays, startOfDay } from 'date-fns';
import { LogLevel, SYSTEM_LOGS_COLLECTION, USER_ACTIVITY_LOGS_COLLECTION } from '@/app/features/auth/types/log';
import { cleanupOldLogs } from '@/app/features/admin/services/logAdminService';
import { showErrorToast, showSuccessToast } from '@/app/lib/utils/toastUtils';
import { LogEntry, RawLogDocument } from '../types/log';
import { USER_MANAGEMENT_LOGS_COLLECTION } from '../components/LogFilterControls';

// เพิ่ม interface สำหรับ UserManagementLog
interface UserManagementLogDocument {
  action: string;
  adminUid: string;
  adminUsername: string;
  targetUid: string;
  targetUsername: string;
  timestamp: any;
  details?: Record<string, any>;
}

export const useLogViewer = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawLogs, setRawLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logCollection, setLogCollection] = useState<string>(SYSTEM_LOGS_COLLECTION);
  const [logType, setLogType] = useState<string>('all');
  const [username, setUsername] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('7');
  const [limitCount, setLimitCount] = useState<number>(50);

  const handleLogCollectionChange = (collection: string) => {
    setLogCollection(collection);
    setLogType('all');
    setUsername('');
    setDateRange('7');
    setLimitCount(50);
  };

  // Convert RawLogDocument to LogEntry for display
  const mapRawLogToEntry = (doc: any): LogEntry => {
    const data = doc.data() as RawLogDocument;
    
    return {
      id: doc.id,
      timestamp: data.timestamp,
      actor: data.actor,
      action: data.action,
      target: data.target,
      clientInfo: data.clientInfo,
      details: data.details,
      // Computed display fields
      displayUsername: data.actor?.username || 'Unknown',
      displayType: data.action?.type || 'Unknown',
      displayTime: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
    };
  };

  // Convert UserManagementLog to LogEntry for display
  const mapUserManagementLogToEntry = (doc: any): LogEntry => {
    const data = doc.data() as UserManagementLogDocument;
    
    return {
      id: doc.id,
      timestamp: data.timestamp,
      actor: {
        id: data.adminUid,
        username: data.adminUsername,
        role: 'admin', // Admin เป็นผู้ดำเนินการ
        active: true
      },
      action: {
        type: data.action,
        status: 'SUCCESS'
      },
      target: {
        id: data.targetUid,
        type: 'USER',
        displayName: data.targetUsername
      },
      details: data.details,
      // Computed display fields
      displayUsername: data.adminUsername,
      displayType: data.action,
      displayTime: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
    };
  };

  const fetchLogs = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const logsRef = collection(db, logCollection);
      
      // สำหรับ userManagementLogs ใช้ field `action` แทน `action.type`
      let constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];
      
      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        const startDate = startOfDay(subDays(new Date(), days));
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
      }
      
      // Filter by action based on collection type
      if (logType !== 'all') {
        if (logCollection === USER_MANAGEMENT_LOGS_COLLECTION) {
          // สำหรับ userManagementLogs ใช้ field `action` โดยตรง
          constraints.push(where('action', '==', logType));
        } else {
          // สำหรับ StandardLog collections ใช้ `action.type`
          constraints.push(where('action.type', '==', logType));
        }
      }
      
      constraints.push(limit(limitCount));
      
      const q = query(logsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      // ใช้ mapping function ที่เหมาะสมตาม collection
      const logsData: LogEntry[] = snapshot.docs.map(doc => {
        if (logCollection === USER_MANAGEMENT_LOGS_COLLECTION) {
          return mapUserManagementLogToEntry(doc);
        } else {
          return mapRawLogToEntry(doc);
        }
      });
      
      setRawLogs(logsData);
      console.log(`📊 [LOG_VIEWER] Loaded ${logsData.length} logs from ${logCollection}`);
    } catch (error: any) {
      console.error('🔍 [LOG_VIEWER] Error fetching logs:', error);
      
      // Fallback: try with old structure if new structure fails
      if (error.code === 'failed-precondition' || error.message.includes('timestamp')) {
        console.log('🔄 [LOG_VIEWER] Falling back to old log structure...');
        try {
          const logsRef = collection(db, logCollection);
          let fallbackConstraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
          
          if (dateRange !== 'all') {
            const days = parseInt(dateRange, 10);
            const startDate = startOfDay(subDays(new Date(), days));
            fallbackConstraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
          }
          
          if (logType !== 'all') {
            fallbackConstraints.push(where('type', '==', logType));
          }
          
          fallbackConstraints.push(limit(limitCount));
          
          const fallbackQuery = query(logsRef, ...fallbackConstraints);
          const fallbackSnapshot = await getDocs(fallbackQuery);
          
          // Map old structure to new structure
          const fallbackLogs: LogEntry[] = fallbackSnapshot.docs.map(doc => {
            const oldData = doc.data();
            return {
              id: doc.id,
              timestamp: oldData.createdAt || oldData.timestamp,
              actor: {
                id: oldData.userId || 'unknown',
                username: oldData.username || 'Unknown',
                role: oldData.details?.role || 'unknown',
                active: true
              },
              action: {
                type: oldData.type || 'UNKNOWN',
                status: 'SUCCESS'
              },
              clientInfo: {
                ipAddress: oldData.ipAddress,
                userAgent: oldData.details?.userAgent,
                deviceType: oldData.details?.deviceType
              },
              details: oldData.details,
              displayUsername: oldData.username || 'Unknown',
              displayType: oldData.type || 'Unknown',
              displayTime: oldData.createdAt?.toDate ? oldData.createdAt.toDate() : new Date()
            };
          });
          
          setRawLogs(fallbackLogs);
          console.log('✅ [LOG_VIEWER] Fallback successful, loaded old format logs');
        } catch (fallbackError: any) {
          console.error('❌ [LOG_VIEWER] Fallback also failed:', fallbackError);
          showErrorToast(`เกิดข้อผิดพลาดในการโหลดข้อมูล Log: ${fallbackError.message}`);
        }
      } else {
        showErrorToast(`เกิดข้อผิดพลาดในการโหลดข้อมูล Log: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user, logType, dateRange, logCollection, limitCount]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (username.trim()) {
      const filtered = rawLogs.filter(log =>
        log.displayUsername && log.displayUsername.toLowerCase().includes(username.toLowerCase())
      );
      setLogs(filtered);
    } else {
      setLogs(rawLogs);
    }
  }, [rawLogs, username]);

  const handleCleanupOldLogs = async (days: number) => {
    if (window.confirm(`คุณต้องการลบ logs ของ "${logCollection}" ที่เก่ากว่า ${days} วันหรือไม่?`)) {
      try {
        setLoading(true);
        const count = await cleanupOldLogs(logCollection, days);
        showSuccessToast(`ลบ logs เก่าสำเร็จ: ${count} รายการ`);
        fetchLogs(); // Refresh logs after cleanup
      } catch (error: any) {
        console.error('Error cleaning up logs:', error);
        showErrorToast(`เกิดข้อผิดพลาดในการลบ logs: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    logs,
    loading,
    filters: {
      logCollection,
      logType,
      username,
      dateRange,
      limitCount
    },
    setters: {
      setLogCollection,
      handleLogCollectionChange,
      setLogType,
      setUsername,
      setDateRange,
      setLimitCount
    },
    fetchLogs,
    handleCleanupOldLogs
  };
}; 