'use client';

import React, { useState } from 'react';
import { format as dateFormat, formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { LogEntry } from '../types/log';
import { LogLevel } from '@/app/features/auth/types/log';

interface LogsTableProps {
  logs: LogEntry[];
  loading: boolean;
}

// Risk Assessment สำหรับโรงพยาบาล
const getRiskLevel = (log: LogEntry): 'low' | 'medium' | 'high' => {
  const actionType = log.action?.type?.toLowerCase() || '';
  const status = log.action?.status?.toLowerCase() || '';
  const responseTime = log.details?.responseTime || 0;
  
  // High Risk: Login failures, system errors, slow responses (>3s)
  if (status === 'failure' || actionType.includes('error') || responseTime > 3000) return 'high';
  
  // Medium Risk: After hours access (22:00-06:00), multiple rapid logins
  const logTime = log.displayTime || (log.timestamp?.toDate ? log.timestamp.toDate() : new Date());
  const hour = logTime.getHours();
  if (hour >= 22 || hour <= 6) return 'medium';
  
  return 'low';
};

const RiskIndicator: React.FC<{ risk: 'low' | 'medium' | 'high' }> = ({ risk }) => {
  const colors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    high: 'bg-red-100 text-red-800 border-red-200'
  };
  
  const icons = { low: '🛡️', medium: '⚠️', high: '🚨' };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${colors[risk]}`}>
      {icons[risk]} {risk.toUpperCase()}
    </span>
  );
};

const getLogLevelIcon = (actionStatus?: string) => {
  if (!actionStatus) return <span title="Log" className="text-gray-500">📄</span>;
  switch (actionStatus.toLowerCase()) {
    case 'failure': return <span title="Failure" className="text-red-500">❌</span>;
    case 'pending': return <span title="Pending" className="text-yellow-500">⏳</span>;
    case 'success': return <span title="Success" className="text-green-500">✅</span>;
    default: return <span title="Log" className="text-gray-500">📄</span>;
  }
};

const LogTypeBadge: React.FC<{ actionType: string; actionStatus: string }> = ({ actionType, actionStatus }) => {
  const getBadgeStyle = () => {
    const type = actionType.toLowerCase();
    const status = actionStatus.toLowerCase();
    
    if (status === 'failure' || type.includes('error')) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (type.includes('login')) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (type.includes('logout')) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (type.includes('page') || type.includes('navigation')) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    if (type.includes('user') || type.includes('action')) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
  
  const displayText = actionType
    .replace('AUTH.', '')
    .replace('NAVIGATION.', '')
    .replace('SYSTEM.', '')
    .replace('USER.', '')
    .replace('_', ' ');
  
  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeStyle()}`}>
        {displayText}
      </span>
      {actionStatus !== 'SUCCESS' && (
        <span className={`px-1 py-0.5 text-xs rounded ${
          actionStatus === 'FAILURE' ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'
        }`}>
          {actionStatus}
        </span>
      )}
    </div>
  );
}

// เพิ่ม Session Duration Calculator
const calculateSessionDuration = (logs: LogEntry[], currentLog: LogEntry): string => {
  if (currentLog.action?.type !== 'AUTH.LOGOUT') return '-';
  
  const username = currentLog.actor?.username;
  const logoutTime = currentLog.displayTime || (currentLog.timestamp?.toDate ? currentLog.timestamp.toDate() : new Date());
  
  // หา login log ล่าสุดของ user เดียวกัน
  const loginLog = logs.find(log => 
    log.actor?.username === username && 
    log.action?.type === 'AUTH.LOGIN' &&
    (log.displayTime || log.timestamp?.toDate?.()) < logoutTime
  );
  
  if (!loginLog) return 'ไม่ทราบ';
  
  const loginTime = loginLog.displayTime || (loginLog.timestamp?.toDate ? loginLog.timestamp.toDate() : new Date());
  return formatDistanceToNow(loginTime, { addSuffix: false, locale: th });
};

export const LogsTable: React.FC<LogsTableProps> = ({ logs, loading }) => {
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export Functionality สำหรับ Audit
  const exportLogs = (exportFormat: 'csv' | 'json') => {
    // Safety check: handle empty logs
    if (!logs || logs.length === 0) {
      alert('⚠️ ไม่มีข้อมูล Log สำหรับ Export\nกรุณาปรับเงื่อนไขการค้นหาหรือเลือกช่วงวันที่ที่มีข้อมูล');
      setShowExportMenu(false);
      return;
    }

    const exportData = logs.map(log => ({
      timestamp: log.displayTime ? dateFormat(log.displayTime, 'yyyy-MM-dd HH:mm:ss') : '',
      username: log.actor?.username || '',
      role: log.actor?.role || '',
      action: log.action?.type || '',
      status: log.action?.status || '',
      ipAddress: log.clientInfo?.ipAddress || '',
      deviceType: log.clientInfo?.deviceType || '',
      riskLevel: getRiskLevel(log),
      responseTime: log.details?.responseTime || 0,
      sessionDuration: calculateSessionDuration(logs, log)
    }));

    // Double safety check for exportData
    if (!exportData || exportData.length === 0) {
      alert('⚠️ ไม่สามารถประมวลผลข้อมูลสำหรับ Export ได้');
      setShowExportMenu(false);
      return;
    }

    if (exportFormat === 'csv') {
      const csvHeaders = Object.keys(exportData[0]).join(',');
      const csvRows = exportData.map(row => Object.values(row).join(','));
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${dateFormat(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } else {
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${dateFormat(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
    }
    
    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-400">กำลังโหลดบันทึกระบบ...</p>
      </div>
    );
  }

  // Hospital Risk Summary
  const riskSummary = logs.reduce((acc, log) => {
    const risk = getRiskLevel(log);
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Hospital Security Summary Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🏥 ระบบติดตามความปลอดภัย
            </h3>
            <div className="flex space-x-3">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-sm text-gray-600">High Risk: {riskSummary.high || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="text-sm text-gray-600">Medium Risk: {riskSummary.medium || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-sm text-gray-600">Low Risk: {riskSummary.low || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              📊 Export Audit Report
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                <button
                  onClick={() => exportLogs('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  📄 Export CSV (Excel)
                </button>
                <button
                  onClick={() => exportLogs('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  📋 Export JSON (Technical)
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          แสดงผล {logs.length} รายการ - สำหรับการตรวจสอบความปลอดภัยและการปฏิบัติตามมาตรฐานโรงพยาบาล
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ความเสี่ยง</th>
              <th scope="col" className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">สถานะ</th>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ประเภท</th>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้ใช้</th>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">เวลา</th>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ระยะเวลาใช้งาน</th>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">รายละเอียดทางเทคนิค</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                  getRiskLevel(log) === 'high' ? 'bg-red-50 dark:bg-red-900/20' : 
                  getRiskLevel(log) === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                }`}>
                  <td className="py-4 px-4 text-center">
                    <RiskIndicator risk={getRiskLevel(log)} />
                  </td>
                  <td className="py-4 px-4 text-center text-lg">
                    {getLogLevelIcon(log.action?.status)}
                  </td>
                  <td className="py-4 px-4">
                    <LogTypeBadge 
                      actionType={log.action?.type || log.displayType || 'Unknown'} 
                      actionStatus={log.action?.status || 'SUCCESS'} 
                    />
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex flex-col">
                      <span className="flex items-center">
                        {log.actor?.username || log.displayUsername || 'Unknown'}
                        {log.actor?.role === 'developer' && <span className="ml-1 text-xs text-purple-600">👨‍💻</span>}
                        {log.actor?.role === 'admin' && <span className="ml-1 text-xs text-blue-600">👩‍⚕️</span>}
                        {(log.actor?.role === 'nurse' || log.actor?.role === 'approver') && <span className="ml-1 text-xs text-green-600">🩺</span>}
                      </span>
                      <span className="text-xs text-gray-500">({log.actor?.role || 'unknown'})</span>
                      <span className="text-xs text-gray-400">{log.clientInfo?.ipAddress || 'IP ไม่ทราบ'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col">
                      <span>
                        {log.displayTime ? 
                          dateFormat(log.displayTime, 'dd/MM/yyyy HH:mm:ss') : 
                          (log.timestamp?.toDate ? 
                            dateFormat(log.timestamp.toDate(), 'dd/MM/yyyy HH:mm:ss') : 
                            'ไม่ระบุ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {log.displayTime ? formatDistanceToNow(log.displayTime, { addSuffix: true, locale: th }) : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {calculateSessionDuration(logs, log)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-300">
                    {(log.details || log.clientInfo || log.target) && (
                      <div className="flex flex-col space-y-1">
                        {log.clientInfo?.deviceType && <div><span className="font-semibold">Device:</span> {log.clientInfo.deviceType}</div>}
                        {log.clientInfo?.userAgent && (
                          <div><span className="font-semibold">Browser:</span> {
                            log.clientInfo.userAgent.includes('Chrome') ? 'Chrome' :
                            log.clientInfo.userAgent.includes('Firefox') ? 'Firefox' :
                            log.clientInfo.userAgent.includes('Safari') ? 'Safari' : 'Other'
                          }</div>
                        )}
                        {log.details?.responseTime && (
                          <div>
                            <span className="font-semibold">Response:</span> 
                            <span className={log.details.responseTime > 3000 ? 'text-red-600 font-bold' : log.details.responseTime > 1000 ? 'text-yellow-600' : 'text-green-600'}>
                              {log.details.responseTime}ms
                            </span>
                          </div>
                        )}
                        {log.details?.reason && <div><span className="font-semibold">Reason:</span> {log.details.reason}</div>}
                        {log.details?.errorMessage && <div className="text-red-500"><span className="font-semibold">Error:</span> {log.details.errorMessage}</div>}
                        {log.target && (
                          <div><span className="font-semibold">Target:</span> {log.target.displayName || log.target.id} ({log.target.type})</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2">ไม่พบบันทึกตามเงื่อนไขที่กำหนด</p>
                    <p className="mt-1 text-xs">ลองเปลี่ยนช่วงวันที่หรือประเภท Log</p>
                    <p className="mt-1 text-xs text-green-600">✅ สถานการณ์ปกติ - ไม่มีกิจกรรมที่น่าสงสัย</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 