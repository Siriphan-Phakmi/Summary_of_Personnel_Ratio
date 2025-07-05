'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp, QueryConstraint, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { useAuth } from '@/app/features/auth';
import { subDays, startOfDay } from 'date-fns';
import { LogLevel, SYSTEM_LOGS_COLLECTION, USER_ACTIVITY_LOGS_COLLECTION, USER_MANAGEMENT_LOGS_COLLECTION, ActionStatus } from '@/app/features/auth/types/log';
import { UserRole } from '@/app/features/auth/types/user';
import { cleanupOldLogs, deleteAllLogs, deleteSelectedLogs } from '@/app/features/admin/services/logAdminService';
import { showErrorToast, showSuccessToast } from '@/app/lib/utils/toastUtils';
import { LogEntry, RawLogDocument } from '../types/log';
import { 
  validateDeleteAllLogsPermission, 
  validateDeleteSelectedLogsPermission, 
  validateCleanupLogsPermission,
  logSecurityViolation 
} from '../utils/logSecurityValidation';

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

// Helper functions outside the hook to avoid dependency issues
const safeUserRole = (role: string): UserRole | 'SYSTEM' => {
  const validRoles = Object.values(UserRole);
  return validRoles.includes(role as UserRole) ? role as UserRole : 'SYSTEM';
};

const safeActionStatus = (status: string): ActionStatus => {
  const validStatuses: ActionStatus[] = ['SUCCESS', 'FAILURE', 'PENDING'];
  return validStatuses.includes(status as ActionStatus) ? status as ActionStatus : 'SUCCESS';
};

const safeDeviceType = (deviceType?: string): 'desktop' | 'mobile' | 'tablet' | 'server' | 'unknown' | undefined => {
  if (!deviceType) return undefined;
  const validTypes = ['desktop', 'mobile', 'tablet', 'server', 'unknown'];
  return validTypes.includes(deviceType) ? deviceType as any : 'unknown';
};

const mapRawLogToEntry = (doc: any): LogEntry => {
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

const mapUserManagementLogToEntry = (doc: any): LogEntry => {
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
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);
  const [pageHistory, setPageHistory] = useState<DocumentSnapshot[]>([]);
  
  // Selection States
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

  const handleLogCollectionChange = (collection: string) => {
    setLogCollection(collection);
    setLogType('all');
    setUsername('');
    setDateRange('7');
    setLimitCount(50);
    // Reset pagination
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);
    setHasNextPage(false);
    setHasPrevPage(false);
    setPageHistory([]);
    setSelectedLogs([]);
  };


  // Selection Management Functions
  const handleSelectLog = (logId: string) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const handleSelectAll = () => {
    setSelectedLogs(logs.map(log => log.id));
  };

  const handleClearSelection = () => {
    setSelectedLogs([]);
  };

  // Pagination Functions
  const fetchLogsWithPagination = useCallback(async (pageDirection: 'first' | 'next' | 'prev' = 'first') => {
    if (!user) return;

    console.log(`🔍 [LOG_VIEWER] Starting fetchLogsWithPagination(${pageDirection})`);
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
      
      // ✅ FIXED: Use current state values instead of dependency values
      if (pageDirection === 'next') {
        const currentLastDoc = lastVisibleDoc;
        if (currentLastDoc) {
          constraints.push(startAfter(currentLastDoc));
        }
      } else if (pageDirection === 'prev') {
        const currentHistory = pageHistory;
        if (currentHistory.length > 0) {
          const prevDoc = currentHistory[currentHistory.length - 2]; // Go back one page
          if (prevDoc) {
            constraints.push(startAfter(prevDoc));
          }
        }
      }
      
      constraints.push(limit(limitCount + 1)); // +1 to check if next page exists
      
      const q = query(logsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      // ใช้ mapping function ที่เหมาะสมตาม collection และจัดการ pagination
      const docs = snapshot.docs;
      const hasMore = docs.length > limitCount;
      const actualDocs = hasMore ? docs.slice(0, limitCount) : docs;
      
      const logsData: LogEntry[] = actualDocs.map(doc => {
        if (logCollection === USER_MANAGEMENT_LOGS_COLLECTION) {
          return mapUserManagementLogToEntry(doc);
        } else {
          return mapRawLogToEntry(doc);
        }
      });
      
      // ✅ FIXED: Update pagination state in separate function calls
      if (pageDirection === 'first') {
        setCurrentPage(1);
        setPageHistory([]);
        setHasPrevPage(false);
      } else if (pageDirection === 'next') {
        setCurrentPage(prev => prev + 1);
        setPageHistory(prev => lastVisibleDoc ? [...prev, lastVisibleDoc] : prev);
        setHasPrevPage(true);
      } else if (pageDirection === 'prev') {
        setCurrentPage(prev => Math.max(1, prev - 1));
        setPageHistory(prev => prev.slice(0, -1));
        setHasPrevPage(pageHistory.length > 1);
      }
      
      setHasNextPage(hasMore);
      setFirstVisibleDoc(actualDocs[0] || null);
      setLastVisibleDoc(actualDocs[actualDocs.length - 1] || null);
      
      setRawLogs(logsData);
      console.log(`📊 [LOG_VIEWER] Loaded ${logsData.length} logs from ${logCollection} (Page ${currentPage}, HasNext: ${hasMore})`);
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
      console.log(`🔍 [LOG_VIEWER] Finished fetchLogsWithPagination(${pageDirection})`);
      setLoading(false);
    }
  }, [user, logType, dateRange, logCollection, limitCount]); // ✅ REMOVED: lastVisibleDoc, pageHistory

  // ✅ FIXED: Simple fetchLogs wrapper that doesn't cause infinite loop
  const fetchLogs = useCallback(() => {
    // Reset pagination state when fetching fresh data
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);
    setHasNextPage(false);
    setHasPrevPage(false);
    setPageHistory([]);
    setSelectedLogs([]);
    
    return fetchLogsWithPagination('first');
  }, [fetchLogsWithPagination]);

  // ✅ FIXED: Pagination control functions with proper state access
  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      fetchLogsWithPagination('next');
    }
  }, [hasNextPage, fetchLogsWithPagination]);

  const goToPrevPage = useCallback(() => {
    if (hasPrevPage) {
      fetchLogsWithPagination('prev');
    }
  }, [hasPrevPage, fetchLogsWithPagination]);

  // ✅ FIXED: Only trigger on filter changes, not on every state change
  useEffect(() => {
    console.log(`🔄 [LOG_VIEWER] useEffect triggered - Collection: ${logCollection}, Type: ${logType}, DateRange: ${dateRange}, Limit: ${limitCount}`);
    
    if (!user) return;
    
    const loadInitialData = async () => {
      console.log(`🔄 [LOG_VIEWER] loadInitialData() called`);
      // Reset pagination state when fetching fresh data
      setCurrentPage(1);
      setLastVisibleDoc(null);
      setFirstVisibleDoc(null);
      setHasNextPage(false);
      setHasPrevPage(false);
      setPageHistory([]);
      setSelectedLogs([]);
      
      // Call directly without using fetchLogsWithPagination dependency
      setLoading(true);
      try {
        const logsRef = collection(db, logCollection);
        let constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];
        
        if (dateRange !== 'all') {
          const days = parseInt(dateRange, 10);
          const startDate = startOfDay(subDays(new Date(), days));
          constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
        }
        
        if (logType !== 'all') {
          if (logCollection === USER_MANAGEMENT_LOGS_COLLECTION) {
            constraints.push(where('action', '==', logType));
          } else {
            constraints.push(where('action.type', '==', logType));
          }
        }
        
        constraints.push(limit(limitCount + 1));
        
        const q = query(logsRef, ...constraints);
        const snapshot = await getDocs(q);
        
        const docs = snapshot.docs;
        const hasMore = docs.length > limitCount;
        const actualDocs = hasMore ? docs.slice(0, limitCount) : docs;
        
        const logsData: LogEntry[] = actualDocs.map(doc => {
          if (logCollection === USER_MANAGEMENT_LOGS_COLLECTION) {
            return mapUserManagementLogToEntry(doc);
          } else {
            return mapRawLogToEntry(doc);
          }
        });
        
        setHasNextPage(hasMore);
        setFirstVisibleDoc(actualDocs[0] || null);
        setLastVisibleDoc(actualDocs[actualDocs.length - 1] || null);
        setRawLogs(logsData);
        
        console.log(`📊 [LOG_VIEWER] Initial load: ${logsData.length} logs from ${logCollection}`);
      } catch (error: any) {
        console.error('❌ [LOG_VIEWER] Initial load error:', error);
        showErrorToast(`เกิดข้อผิดพลาดในการโหลดข้อมูล Log: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [user, logCollection, logType, dateRange, limitCount]); // ✅ No function dependencies

  // ✅ Client-side filtering effect (unchanged)
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
    // Security validation
    const validation = validateCleanupLogsPermission(user, days);
    if (!validation.isAllowed) {
      await logSecurityViolation(user, 'CLEANUP_OLD_LOGS', validation.reason || 'Unknown reason');
      showErrorToast(validation.reason || 'ไม่มีสิทธิ์ในการลบ logs เก่า');
      return;
    }

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

  // Delete all logs function with security validation
  const handleDeleteAllLogs = async () => {
    // Security validation
    const validation = validateDeleteAllLogsPermission(user);
    if (!validation.isAllowed) {
      await logSecurityViolation(user, 'DELETE_ALL_LOGS', validation.reason || 'Unknown reason');
      showErrorToast(validation.reason || 'ไม่มีสิทธิ์ในการลบ logs ทั้งหมด');
      return;
    }

    const confirmMessage = `🚨 DANGER: คุณต้องการลบ logs ทั้งหมดใน "${logCollection}" หรือไม่?\n\n⚠️ การกระทำนี้ไม่สามารถยกเลิกได้!\n✅ กดตกลงเพื่อยืนยัน\n❌ กดยกเลิกเพื่อหยุด`;
    
    if (window.confirm(confirmMessage)) {
      const doubleConfirm = window.confirm(`🔴 ยืนยันอีกครั้ง: ลบ logs ทั้งหมดใน "${logCollection}" จริงหรือ?\n\nนี่เป็นการกระทำที่ไม่สามารถย้อนกลับได้!`);
      
      if (doubleConfirm) {
        try {
          setLoading(true);
          const count = await deleteAllLogs(logCollection);
          showSuccessToast(`🗑️ ลบ logs ทั้งหมดสำเร็จ: ${count} รายการ`);
          setSelectedLogs([]); // Clear selection
          fetchLogs(); // Refresh logs
        } catch (error: any) {
          console.error('Error deleting all logs:', error);
          showErrorToast(`เกิดข้อผิดพลาดในการลบ logs ทั้งหมด: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Delete selected logs function with security validation
  const handleDeleteSelectedLogs = async () => {
    // Security validation
    const validation = validateDeleteSelectedLogsPermission(user, selectedLogs.length);
    if (!validation.isAllowed) {
      await logSecurityViolation(user, 'DELETE_SELECTED_LOGS', validation.reason || 'Unknown reason');
      showErrorToast(validation.reason || 'ไม่มีสิทธิ์ในการลบ logs ที่เลือก');
      return;
    }

    if (window.confirm(`คุณต้องการลบ logs ที่เลือก ${selectedLogs.length} รายการหรือไม่?`)) {
      try {
        setLoading(true);
        const count = await deleteSelectedLogs(logCollection, selectedLogs);
        showSuccessToast(`ลบ logs ที่เลือกสำเร็จ: ${count} รายการ`);
        setSelectedLogs([]); // Clear selection
        fetchLogs(); // Refresh logs
      } catch (error: any) {
        console.error('Error deleting selected logs:', error);
        showErrorToast(`เกิดข้อผิดพลาดในการลบ logs ที่เลือก: ${error.message}`);
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
    handleCleanupOldLogs,
    // New bulk delete functions
    handleDeleteAllLogs,
    handleDeleteSelectedLogs,
    // Selection management
    selectedLogs,
    handleSelectLog,
    handleSelectAll,
    handleClearSelection,
    // Pagination
    pagination: {
      currentPage,
      hasNextPage,
      hasPrevPage,
      goToNextPage,
      goToPrevPage
    }
  };
}; 