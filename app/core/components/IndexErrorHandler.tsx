'use client';

import React, { useState, useEffect } from 'react';
import { handleIndexError } from '@/app/core/firebase/indexDetector';
import { showErrorToast } from '@/app/core/utils/toastUtils';

interface IndexErrorProps {
  error: unknown;
  context?: string;
  onRetry?: () => void;
}

/**
 * Component สำหรับแสดงข้อความเมื่อเกิด Index Error
 */
export const IndexErrorDisplay: React.FC<IndexErrorProps> = ({ error, context = '', onRetry }) => {
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const firestoreError = error as any;
    if (firestoreError?.message) {
      const urlMatch = firestoreError.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
      if (urlMatch) {
        setIndexUrl(urlMatch[0]);
      }
    }
    
    // แสดง toast เพื่อแจ้งเตือนผู้ใช้
    showErrorToast('พบปัญหาเกี่ยวกับ Firestore Index กรุณาแจ้งผู้ดูแลระบบ');
  }, [error]);
  
  return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
        พบปัญหาเกี่ยวกับ Firestore Index
      </h3>
      
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        ระบบไม่สามารถดึงข้อมูลได้เนื่องจากขาด Index ที่จำเป็น กรุณาแจ้งผู้ดูแลระบบเพื่อสร้าง Index ที่ต้องการ
      </p>
      
      {indexUrl && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-800/30 rounded border border-red-200 dark:border-red-700 overflow-auto">
          <p className="mb-1 text-sm font-medium text-red-800 dark:text-red-200">ลิงก์สำหรับสร้าง Index:</p>
          <a 
            href={indexUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 break-all"
          >
            {indexUrl}
          </a>
        </div>
      )}
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      )}
    </div>
  );
};

/**
 * Higher-order component สำหรับจัดการ Firestore Index Error
 * ใช้ครอบ Component ที่อาจเกิด Error จากการไม่มี Index
 */
export function withIndexErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  context: string
): React.FC<P> {
  return function WithIndexErrorHandling(props: P) {
    const [error, setError] = useState<unknown | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    
    useEffect(() => {
      setError(null);
    }, [isRetrying]);
    
    const handleError = (err: unknown) => {
      if (handleIndexError(err, context)) {
        setError(err);
        return true;
      }
      return false;
    };
    
    const handleRetry = () => {
      setIsRetrying(!isRetrying);
    };
    
    if (error) {
      return <IndexErrorDisplay error={error} context={context} onRetry={handleRetry} />;
    }
    
    return <Component {...props} onIndexError={handleError} />;
  };
}

export default withIndexErrorHandling; 