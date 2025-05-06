'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAt, endAt, Timestamp } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { useAuth } from '@/app/features/auth/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { LogLevel, SYSTEM_LOGS_COLLECTION, USER_ACTIVITY_LOGS_COLLECTION } from '@/app/core/utils/logUtils';
import { cleanupOldLogs } from '@/app/core/utils/logUtils';

interface LogEntry {
  id: string;
  type: string;
  userId: string;
  username: string;
  createdAt: any;
  details: any;
  logLevel?: LogLevel;
  ipAddress?: string;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<string>('all');
  const [username, setUsername] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('7');
  const [logCollection, setLogCollection] = useState<string>(SYSTEM_LOGS_COLLECTION);
  const [limitCount, setLimitCount] = useState<number>(50);
  const { user } = useAuth();

  const fetchLogs = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      setLoading(true);
      const logsRef = collection(db, logCollection);
      
      // สร้าง query conditions
      let constraints: any[] = [orderBy('createdAt', 'desc')];
      
      // ฟิลเตอร์ตามวันที่
      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = startOfDay(subDays(new Date(), days));
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      
      // ฟิลเตอร์ตามประเภท
      if (logType !== 'all') {
        constraints.push(where('type', '==', logType));
      }
      
      // จำกัดจำนวนรายการ
      constraints.push(limit(limitCount));
      
      // สร้าง query
      const q = query(logsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      // แปลงข้อมูล
      const logsData: LogEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({
          id: doc.id,
          type: data.type,
          userId: data.userId,
          username: data.username,
          createdAt: data.createdAt,
          details: data.details,
          logLevel: data.logLevel,
          ipAddress: data.ipAddress
        });
      });
      
      // กรองตามชื่อผู้ใช้ (ทำบน client เนื่องจาก Firestore ไม่สนับสนุนการค้นหาแบบ contains)
      let filteredLogs = logsData;
      if (username.trim()) {
        filteredLogs = logsData.filter(log => 
          log.username.toLowerCase().includes(username.toLowerCase())
        );
      }
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // เรียกใช้เมื่อมี filter เปลี่ยนแปลง
  useEffect(() => {
    fetchLogs();
  }, [user, logType, dateRange, logCollection, limitCount]);
  
  // ล้าง Logs เก่า (แสดงปุ่มสำหรับ Admin)
  const handleCleanupOldLogs = async (days: number) => {
    if (window.confirm(`คุณต้องการลบ logs ที่เก่ากว่า ${days} วันหรือไม่?`)) {
      try {
        setLoading(true);
        const count = await cleanupOldLogs(logCollection, days);
        alert(`ลบ logs เก่าสำเร็จ: ${count} รายการ`);
        fetchLogs(); // โหลดข้อมูลใหม่
      } catch (error) {
        console.error('Error cleaning up logs:', error);
        alert('เกิดข้อผิดพลาดในการลบ logs');
      } finally {
        setLoading(false);
      }
    }
  };

  const getLogLevelIcon = (level?: LogLevel) => {
    if (!level) return '📄';
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.DEBUG: return '🔍';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <ProtectedPage requiredRole="admin">
        <div className="p-4">กำลังโหลดบันทึกระบบ...</div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRole="admin">
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">บันทึกการทำงานของระบบ</h2>
        
        {/* Filter Controls */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ประเภท Log</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                value={logCollection}
                onChange={(e) => setLogCollection(e.target.value)}
              >
                <option value={SYSTEM_LOGS_COLLECTION}>System Logs</option>
                <option value={USER_ACTIVITY_LOGS_COLLECTION}>User Activity Logs</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">ประเภทการกระทำ</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
              >
                <option value="all">ทั้งหมด</option>
                <option value="auth.login">เข้าสู่ระบบ</option>
                <option value="auth.logout">ออกจากระบบ</option>
                <option value="auth.login_failed">เข้าสู่ระบบล้มเหลว</option>
                <option value="page.access">เข้าถึงหน้า</option>
                <option value="system.error">ข้อผิดพลาดระบบ</option>
                {logCollection === USER_ACTIVITY_LOGS_COLLECTION && (
                  <>
                    <option value="user.action.create">สร้างข้อมูล</option>
                    <option value="user.action.update">แก้ไขข้อมูล</option>
                    <option value="user.action.delete">ลบข้อมูล</option>
                  </>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">ช่วงเวลา</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="1">1 วันล่าสุด</option>
                <option value="7">7 วันล่าสุด</option>
                <option value="30">30 วันล่าสุด</option>
                <option value="90">90 วันล่าสุด</option>
                <option value="all">ทั้งหมด</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
              <div className="flex">
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อผู้ใช้..." 
                  className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
                />
                <button 
                  className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={fetchLogs}
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap justify-between items-center">
            <div>
              <label className="text-sm font-medium mr-2">จำนวนรายการ:</label>
              <select 
                className="p-1 border rounded dark:bg-gray-800 dark:border-gray-600"
                value={limitCount}
                onChange={(e) => setLimitCount(parseInt(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            
            <div className="mt-2 md:mt-0">
              <button 
                className="bg-red-500 text-white px-3 py-1 text-sm rounded mr-2"
                onClick={() => handleCleanupOldLogs(30)}
              >
                ลบบันทึกเก่ากว่า 30 วัน
              </button>
              <button 
                className="bg-red-700 text-white px-3 py-1 text-sm rounded"
                onClick={() => handleCleanupOldLogs(90)}
              >
                ลบบันทึกเก่ากว่า 90 วัน
              </button>
            </div>
          </div>
        </div>
        
        {/* Results */}
        <div className="overflow-x-auto">
          <div className="text-sm mb-2">แสดง {logs.length} รายการ</div>
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="py-2 px-4 border-b">ระดับ</th>
                <th className="py-2 px-4 border-b">ประเภท</th>
                <th className="py-2 px-4 border-b">ผู้ใช้</th>
                <th className="py-2 px-4 border-b">IP Address</th>
                <th className="py-2 px-4 border-b">เวลา</th>
                <th className="py-2 px-4 border-b">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="py-2 px-4 text-center">
                    {getLogLevelIcon(log.logLevel)}
                  </td>
                  <td className="py-2 px-4">
                    {log.type === 'auth.login' && <span className="text-green-600 dark:text-green-400">ล็อกอิน</span>}
                    {log.type === 'auth.logout' && <span className="text-blue-600 dark:text-blue-400">ล็อกเอาท์</span>}
                    {log.type === 'auth.login_failed' && <span className="text-red-600 dark:text-red-400">ล็อกอินล้มเหลว</span>}
                    {log.type === 'page.access' && <span className="text-purple-600 dark:text-purple-400">เข้าถึงหน้า</span>}
                    {log.type === 'system.error' && <span className="text-red-600 dark:text-red-400">ข้อผิดพลาดระบบ</span>}
                    {log.type.includes('user.action') && <span className="text-amber-600 dark:text-amber-400">{log.type.replace('user.action.', '')}</span>}
                    {!['auth.login', 'auth.logout', 'auth.login_failed', 'page.access', 'system.error'].includes(log.type) && !log.type.includes('user.action') && <span>{log.type}</span>}
                  </td>
                  <td className="py-2 px-4">{log.username}</td>
                  <td className="py-2 px-4 text-xs">{log.ipAddress || '-'}</td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {log.createdAt && log.createdAt.toDate ? 
                      format(log.createdAt.toDate(), 'dd/MM/yyyy HH:mm:ss') : 
                      'ไม่ระบุ'}
                  </td>
                  <td className="py-2 px-4">
                    {log.details && (
                      <div className="text-sm">
                        {log.details.page && <div>หน้า: {log.details.page}</div>}
                        {log.details.deviceType && <div>อุปกรณ์: {log.details.deviceType}</div>}
                        {log.details.browserName && <div>เบราว์เซอร์: {log.details.browserName}</div>}
                        {log.details.reason && <div>สาเหตุ: {log.details.reason}</div>}
                        {log.details.errorMessage && <div className="text-red-500">ข้อผิดพลาด: {log.details.errorMessage}</div>}
                        {log.details.role && <div>บทบาท: {log.details.role}</div>}
                        {log.type.includes('user.action') && log.details.action && <div>การกระทำ: {log.details.action}</div>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">ไม่พบบันทึกตามเงื่อนไขที่กำหนด</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedPage>
  );
}
