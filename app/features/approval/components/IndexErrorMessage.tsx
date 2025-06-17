'use client';

import React from 'react';
import { FiAlertTriangle, FiExternalLink } from 'react-icons/fi';

interface IndexErrorMessageProps {
  error?: unknown;
}

const extractIndexUrl = (error: unknown): string | null => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String(error.message);
    const urlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    return urlMatch ? urlMatch[0] : null;
  }
  return null;
};

export const IndexErrorMessage: React.FC<IndexErrorMessageProps> = ({ error }) => {
  const indexUrl = extractIndexUrl(error);
  
  return (
    <div className="flex items-start space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md">
      <FiAlertTriangle className="mt-1 h-6 w-6 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-semibold mb-2">ต้องสร้าง Firestore Index</h3>
        <p className="text-sm mb-3">
          การ query นี้ต้องการ composite index ที่ยังไม่ได้สร้างใน Firestore 
          คลิกลิงก์ด้านล่างเพื่อสร้าง index อัตโนมัติ
        </p>
        {indexUrl && (
          <a 
            href={indexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <FiExternalLink className="mr-1 h-4 w-4" />
            สร้าง Index ใน Firebase Console
          </a>
        )}
        <p className="text-xs mt-2 text-amber-500 dark:text-amber-300">
          หลังจากสร้าง index แล้ว รอสักครู่แล้วรีเฟรชหน้านี้
        </p>
      </div>
    </div>
  );
}; 