'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { useAuth } from '@/app/features/auth/AuthContext';
import { format } from 'date-fns';
import ProtectedPage from '@/app/core/ui/ProtectedPage';

interface LogEntry {
  id: string;
  type: string;
  userId: string;
  username: string;
  createdAt: any;
  details: any;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user || user.role !== 'admin') return;
      
      try {
        const logsRef = collection(db, 'systemLogs');
        const q = query(logsRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        const logsData: LogEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logsData.push({
            id: doc.id,
            type: data.type,
            userId: data.userId,
            username: data.username,
            createdAt: data.createdAt,
            details: data.details
          });
        });
        
        setLogs(logsData);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

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
        <h2 className="text-2xl font-bold mb-4">บันทึกการล็อกอิน/ล็อกเอาท์</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="py-2 px-4 border-b">ประเภท</th>
                <th className="py-2 px-4 border-b">ผู้ใช้</th>
                <th className="py-2 px-4 border-b">เวลา</th>
                <th className="py-2 px-4 border-b">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4">
                    {log.type === 'auth.login' && <span className="text-green-600 dark:text-green-400">ล็อกอิน</span>}
                    {log.type === 'auth.logout' && <span className="text-blue-600 dark:text-blue-400">ล็อกเอาท์</span>}
                    {log.type === 'auth.login_failed' && <span className="text-red-600 dark:text-red-400">ล็อกอินล้มเหลว</span>}
                  </td>
                  <td className="py-2 px-4">{log.username}</td>
                  <td className="py-2 px-4">
                    {log.createdAt && log.createdAt.toDate ? 
                      format(log.createdAt.toDate(), 'dd/MM/yyyy HH:mm:ss') : 
                      'ไม่ระบุ'}
                  </td>
                  <td className="py-2 px-4">
                    {log.details && (
                      <div>
                        {log.details.deviceType && <div>อุปกรณ์: {log.details.deviceType}</div>}
                        {log.details.browserName && <div>เบราว์เซอร์: {log.details.browserName}</div>}
                        {log.details.reason && <div>สาเหตุ: {log.details.reason}</div>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedPage>
  );
}
