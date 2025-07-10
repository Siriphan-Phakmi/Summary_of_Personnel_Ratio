'use client';

import React from 'react';
import { useLogViewer } from './hooks/useLogViewer';
import { LogFilterControls } from './components/LogFilterControls';
import { LogsTable } from './components/LogsTable';

interface LogViewerProps {
  className?: string;
}

export default function LogViewer({ className }: LogViewerProps) {
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
    <div className={className}>
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
    </div>
  );
}
