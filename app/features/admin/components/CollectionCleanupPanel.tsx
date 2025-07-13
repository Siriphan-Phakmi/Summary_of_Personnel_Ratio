/**
 * Collection Cleanup Admin Panel
 * UI สำหรับการจัดการ Collection cleanup ตามหลัก Lean Code
 * 
 * @author BPK9 Team
 * @created 2025-01-13
 */

'use client';

import React, { useState, useCallback } from 'react';
import { 
  performLeanCodeCleanup, 
  generateCollectionReport,
  checkCollectionEmpty 
} from '../services/collectionCleanupService';

interface CollectionReport {
  used: Array<{ name: string; count: number }>;
  unused: Array<{ name: string; count: number }>;
  reserved: Array<{ name: string; count: number }>;
}

export const CollectionCleanupPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<CollectionReport | null>(null);
  const [cleanupLog, setCleanupLog] = useState<string[]>([]);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  /**
   * สร้างรายงาน Collection
   */
  const handleGenerateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const collectionReport = await generateCollectionReport();
      setReport(collectionReport);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * เรียกใช้ Lean Code Cleanup
   */
  const handleLeanCleanup = useCallback(async () => {
    setIsLoading(true);
    setCleanupLog([]);
    
    try {
      const result = await performLeanCodeCleanup();
      setCleanupLog(result.report);
      setLastCleanup(new Date());
      
      // รีเฟรช report หลังทำ cleanup
      await handleGenerateReport();
    } catch (error) {
      setCleanupLog([`💥 Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [handleGenerateReport]);

  /**
   * Format วันที่แบบไทย
   */
  const formatThaiDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🧹 Collection Cleanup Panel
          <span className="text-sm font-normal text-gray-500">
            (Lean Code Management)
          </span>
        </h2>
        <p className="text-gray-600 mt-2">
          จัดการและทำความสะอาด Firebase Collections ที่ไม่ได้ใช้งาน
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          📊 สร้างรายงาน Collection
        </button>
        
        <button
          onClick={handleLeanCleanup}
          disabled={isLoading}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          🗑️ เริ่ม Lean Cleanup
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">กำลังประมวลผล...</span>
        </div>
      )}

      {/* Collection Report */}
      {report && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Used Collections */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
              ✅ Collections ที่ใช้งาน
              <span className="text-sm bg-green-200 px-2 py-1 rounded">
                {report.used.length}
              </span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {report.used.map(({ name, count }) => (
                <div key={name} className="flex justify-between items-center text-sm">
                  <span className="font-mono text-green-700">{name}</span>
                  <span className="bg-green-200 px-2 py-1 rounded text-green-800">
                    {count.toLocaleString()} docs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Unused Collections */}
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
              🗑️ Collections ที่ไม่ใช้
              <span className="text-sm bg-red-200 px-2 py-1 rounded">
                {report.unused.length}
              </span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {report.unused.map(({ name, count }) => (
                <div key={name} className="flex justify-between items-center text-sm">
                  <span className="font-mono text-red-700">{name}</span>
                  <span className="bg-red-200 px-2 py-1 rounded text-red-800">
                    {count.toLocaleString()} docs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reserved Collections */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
              🔒 Collections ที่เก็บไว้
              <span className="text-sm bg-yellow-200 px-2 py-1 rounded">
                {report.reserved.length}
              </span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {report.reserved.map(({ name, count }) => (
                <div key={name} className="flex justify-between items-center text-sm">
                  <span className="font-mono text-yellow-700">{name}</span>
                  <span className="bg-yellow-200 px-2 py-1 rounded text-yellow-800">
                    {count.toLocaleString()} docs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Log */}
      {cleanupLog.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            📋 Cleanup Log
            {lastCleanup && (
              <span className="text-sm text-gray-500">
                ({formatThaiDateTime(lastCleanup)})
              </span>
            )}
          </h3>
          <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 max-h-64 overflow-y-auto">
            {cleanupLog.map((line, index) => (
              <div key={index} className="mb-1">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
        <h4 className="font-semibold text-blue-800 mb-2">📌 Lean Code Principle</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>ลบ:</strong> dev_tools_configs (ชัดเจนว่าไม่ใช้)</li>
          <li>• <strong>เก็บไว้:</strong> form_configurations, dashboard_configs, notification_templates, ward_assignments</li>
          <li>• <strong>ปลอดภัย:</strong> สร้าง backup ก่อนลบทุกครั้ง</li>
          <li>• <strong>ไม่กระทบ:</strong> Collections ที่ใช้งานปัจจุบัน</li>
        </ul>
      </div>
    </div>
  );
};
