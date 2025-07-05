'use client';

import React from 'react';
import { useLogViewer } from './hooks/useLogViewer';
import { LogFilterControls } from './components/LogFilterControls';
import { LogsTable } from './components/LogsTable';

export default function LogViewer() {
  const {
    // Data
    logs,
    loading,
    
    // Filter states
    logCollection,
    logType,
    username,
    dateRange,
    limitCount,
    
    // Pagination states
    currentPage,
    hasNextPage,
    hasPrevPage,
    
    // Selection states
    selectedLogs,
    
    // Filter setters
    setLogType,
    setUsername,
    setDateRange,
    setLimitCount,
    handleLogCollectionChange,
    
    // Pagination functions
    goToNextPage,
    goToPrevPage,
    
    // Selection functions
    handleSelectLog,
    handleSelectAll,
    handleClearSelection,
    
    // Action functions
    fetchLogs,
    handleCleanupOldLogs,
    handleDeleteAllLogs,
    handleDeleteSelectedLogs
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
          filters={{
            logCollection,
            logType,
            username,
            dateRange,
            limitCount
          }}
          setters={{
            handleLogCollectionChange,
            setLogType,
            setDateRange,
            setUsername,
            setLimitCount
          }}
          onSearch={fetchLogs}
          onCleanup={handleCleanupOldLogs}
          onDeleteAll={handleDeleteAllLogs}
          onDeleteSelected={handleDeleteSelectedLogs}
          selectedCount={selectedLogs.length}
        />
        
        <LogsTable
          logs={logs}
          loading={loading}
          selectedLogs={selectedLogs}
          onSelectLog={handleSelectLog}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          pagination={{
            currentPage,
            hasNextPage,
            hasPrevPage,
            goToNextPage,
            goToPrevPage
          }}
        />
      </main>
    </div>
  );
}
