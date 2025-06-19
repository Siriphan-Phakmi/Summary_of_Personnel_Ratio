'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { useAuth } from '@/app/features/auth';
import { subDays, startOfDay } from 'date-fns';
import { LogLevel, SYSTEM_LOGS_COLLECTION, USER_ACTIVITY_LOGS_COLLECTION } from '@/app/features/auth/types/log';
import { cleanupOldLogs } from '@/app/features/admin/services/logAdminService';
import { showErrorToast, showSuccessToast } from '@/app/lib/utils/toastUtils';
import { LogEntry } from '../types/log';

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

  const fetchLogs = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const logsRef = collection(db, logCollection);
      
      let constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
      
      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        const startDate = startOfDay(subDays(new Date(), days));
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      
      if (logType !== 'all') {
        constraints.push(where('type', '==', logType));
      }
      
      constraints.push(limit(limitCount));
      
      const q = query(logsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      const logsData: LogEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          userId: data.userId,
          username: data.username,
          createdAt: data.createdAt,
          details: data.details,
          logLevel: data.logLevel,
          ipAddress: data.ipAddress
        };
      });
      
      setRawLogs(logsData);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      showErrorToast(`เกิดข้อผิดพลาดในการโหลดข้อมูล Log: ${error.message}`);
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
        log.username && log.username.toLowerCase().includes(username.toLowerCase())
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
      setLogType,
      setUsername,
      setDateRange,
      setLimitCount
    },
    fetchLogs,
    handleCleanupOldLogs
  };
}; 