'use client';

import React from 'react';
import { useLogViewer } from './hooks/useLogViewer';
import { LogFilterControls } from './components/LogFilterControls';
import { LogsTable } from './components/LogsTable';

export default function LogViewer() {
  const {
    logs,
    loading,
    filters,
    setters,
    fetchLogs,
    handleCleanupOldLogs
  } = useLogViewer();

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          บันทึกการทำงานของระบบ (System Logs)
        </h1>
        <p className="mt-1 text-md text-gray-600 dark:text-gray-400">
          ตรวจสอบและจัดการบันทึกกิจกรรมต่างๆ ที่เกิดขึ้นในระบบ
        </p>
      </header>
      
      <main>
        <LogFilterControls 
          filters={filters}
          setters={setters}
          onSearch={fetchLogs}
          onCleanup={handleCleanupOldLogs}
        />
        
        <LogsTable
          logs={logs}
          loading={loading}
        />
      </main>
    </div>
  );
}
