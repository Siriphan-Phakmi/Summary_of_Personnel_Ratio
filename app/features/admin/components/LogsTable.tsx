'use client';

import React from 'react';
import { format } from 'date-fns';
import { LogEntry } from '../types/log';
import { LogLevel } from '@/app/features/auth/types/log';

interface LogsTableProps {
  logs: LogEntry[];
  loading: boolean;
}

const getLogLevelIcon = (level?: LogLevel) => {
  if (!level) return <span title="Log" className="text-gray-500">📄</span>;
  switch (level) {
    case LogLevel.ERROR: return <span title="Error" className="text-red-500">❌</span>;
    case LogLevel.WARN: return <span title="Warning" className="text-yellow-500">⚠️</span>;
    case LogLevel.INFO: return <span title="Info" className="text-blue-500">ℹ️</span>;
    case LogLevel.DEBUG: return <span title="Debug" className="text-gray-500">🔍</span>;
    default: return <span title="Log" className="text-gray-500">📄</span>;
  }
};

const LogTypeBadge: React.FC<{ logType: string }> = ({ logType }) => {
  const getBadgeStyle = () => {
    if (logType.includes('login_failed') || logType.includes('error')) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (logType.includes('login')) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (logType.includes('logout')) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (logType.includes('access')) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    if (logType.includes('user.action')) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
  const text = logType.replace('auth.', '').replace('page.', '').replace('system.', '').replace('user.action.', '');
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeStyle()}`}>{text}</span>;
}

export const LogsTable: React.FC<LogsTableProps> = ({ logs, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-400">กำลังโหลดบันทึกระบบ...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="text-sm text-gray-600 dark:text-gray-400 p-4">
        แสดงผล {logs.length} รายการ
      </div>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ระดับ</th>
            <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ประเภท</th>
            <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้ใช้</th>
            <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">IP Address</th>
            <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">เวลา</th>
            <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">รายละเอียด</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {logs.length > 0 ? (
            logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <td className="py-4 px-4 text-center text-lg">
                  {getLogLevelIcon(log.logLevel)}
                </td>
                <td className="py-4 px-4">
                  <LogTypeBadge logType={log.type} />
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{log.username}</td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.ipAddress || '-'}</td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {log.createdAt?.toDate ? 
                    format(log.createdAt.toDate(), 'dd/MM/yyyy HH:mm:ss') : 
                    'ไม่ระบุ'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-300">
                  {log.details && (
                    <div className="flex flex-col space-y-1">
                      {log.details.page && <div><span className="font-semibold">Page:</span> {log.details.page}</div>}
                      {log.details.deviceType && <div><span className="font-semibold">Device:</span> {log.details.deviceType}</div>}
                      {log.details.browserName && <div><span className="font-semibold">Browser:</span> {log.details.browserName}</div>}
                      {log.details.reason && <div><span className="font-semibold">Reason:</span> {log.details.reason}</div>}
                      {log.details.errorMessage && <div className="text-red-500"><span className="font-semibold">Error:</span> {log.details.errorMessage}</div>}
                      {log.details.role && <div><span className="font-semibold">Role:</span> {log.details.role}</div>}
                      {log.type.includes('user.action') && log.details.action && <div><span className="font-semibold">Action:</span> {log.details.action}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2">ไม่พบบันทึกตามเงื่อนไขที่กำหนด</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}; 