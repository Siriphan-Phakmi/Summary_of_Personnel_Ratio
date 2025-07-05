'use client';

import React from 'react';
import { LogEntry } from '../types/log';

interface LogTableActionsProps {
  logs: LogEntry[];
  selectedLogs: string[];
  onSelectLog: (logId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export const LogTableActions: React.FC<LogTableActionsProps> = ({
  logs,
  selectedLogs,
  onSelectLog,
  onSelectAll,
  onClearSelection
}) => {
  const allSelected = logs.length > 0 && selectedLogs.length === logs.length;
  const someSelected = selectedLogs.length > 0 && selectedLogs.length < logs.length;

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Master Checkbox */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={allSelected ? onClearSelection : onSelectAll}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {allSelected ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมด'}
            </span>
          </label>

          {/* Selection Info */}
          {selectedLogs.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                เลือกแล้ว {selectedLogs.length} จาก {logs.length} รายการ
              </span>
              <button
                onClick={onClearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
              >
                ยกเลิกการเลือก
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {selectedLogs.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 ใช้ปุ่ม &ldquo;ลบรายการที่เลือก&rdquo; ด้านบนเพื่อลบรายการที่เลือก
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LogRowCheckbox: React.FC<{
  logId: string;
  isSelected: boolean;
  onSelect: (logId: string) => void;
}> = ({ logId, isSelected, onSelect }) => {
  return (
    <td className="py-4 px-2 text-center">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(logId)}
        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600"
        onClick={(e) => e.stopPropagation()}
      />
    </td>
  );
}; 