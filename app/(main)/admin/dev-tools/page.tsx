'use client';

import React, { useState } from 'react';
import ProtectedPage from '@/app/components/ui/ProtectedPage';
import { Button } from '@/app/components/ui/Button';
import { UserRole } from '@/app/features/auth/types/user';
import { useAuth } from '@/app/features/auth';
import LogViewer from '@/app/features/admin/LogViewer';
import { logInfo, logError, logWarning } from '@/app/lib/utils/logger';

export default function DevToolsPage() {
  const { user } = useAuth();
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const appendOutput = (message: string) => {
    setOutput(prev => prev + '\n' + message);
  };

  const clearLogs = async () => {
    setIsLoading(true);
    setOutput('Clearing logs...\n');
    
    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        appendOutput('✅ Logs cleared successfully');
        logInfo('[DevTools] Logs cleared by user', { userId: user?.uid });
      } else {
        appendOutput('❌ Failed to clear logs');
        logError('[DevTools] Log clearing failed with status:', response.status);
      }
    } catch (error) {
      appendOutput(`❌ Error clearing logs: ${error}`);
      logError('[DevTools] Log clearing failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedPage requiredRole={UserRole.DEVELOPER}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🛠️ Developer Tools
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Advanced debugging and testing tools for system administrators
            </p>
          </div>

          {/* Core Dev Tools */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              🛠️ System Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Button
                onClick={clearLogs}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                🗑️ Clear Logs
              </Button>
            </div>
          </div>

          {/* Output Console */}
          {output && (
            <div className="bg-black text-green-400 p-4 rounded-lg mb-8 font-mono text-sm max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          )}

          {/* Log Viewer */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <LogViewer />
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 