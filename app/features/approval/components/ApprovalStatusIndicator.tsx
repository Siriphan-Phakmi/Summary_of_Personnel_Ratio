'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@/app/features/auth/types/user';
import { useApprovalStatusIndicator } from '../hooks/useApprovalStatusIndicator';
import { CheckCircle, Clock, AlertCircle, FileCheck } from 'lucide-react';

interface ApprovalStatusIndicatorProps {
  user: User | null;
  className?: string;
}

/**
 * Component สำหรับแสดงสถานะการอนุมัติใน NavBar
 * - แสดงจำนวนแบบฟอร์มที่รออนุมัติ
 * - ปรับแสดงผลตาม role ของผู้ใช้
 * - คลิกได้เพื่อไปยังหน้า Approval
 */
export const ApprovalStatusIndicator: React.FC<ApprovalStatusIndicatorProps> = ({ 
  user, 
  className = '' 
}) => {
  const router = useRouter();
  const { 
    pendingCount, 
    hasNewSubmissions, 
    loading, 
    error,
    markAsViewed 
  } = useApprovalStatusIndicator({ user });

  // ไม่แสดงถ้าไม่มี user หรือไม่มีสิทธิ์
  if (!user || ![UserRole.NURSE, UserRole.APPROVER, UserRole.ADMIN, UserRole.DEVELOPER].includes(user.role)) {
    return null;
  }

  const handleClick = () => {
    markAsViewed();
    router.push('/census/approval');
  };

  const getDisplayText = () => {
    if (loading) return 'กำลังโหลด...';
    if (error) return 'ข้อผิดพลาด';
    
    switch (user.role) {
      case UserRole.NURSE:
        return pendingCount > 0 
          ? `${pendingCount} รออนุมัติ` 
          : 'ไม่มีรออนุมัติ';
      case UserRole.APPROVER:
      case UserRole.ADMIN:
      case UserRole.DEVELOPER:
        return pendingCount > 0 
          ? `${pendingCount} รอการอนุมัติ` 
          : 'ไม่มีรอการอนุมัติ';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    if (loading) return <Clock className="h-4 w-4" />;
    if (error) return <AlertCircle className="h-4 w-4" />;
    
    if (pendingCount > 0) {
      return hasNewSubmissions 
        ? <AlertCircle className="h-4 w-4" />
        : <FileCheck className="h-4 w-4" />;
    }
    
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (loading) return 'text-gray-500 dark:text-gray-400';
    if (error) return 'text-red-500 dark:text-red-400';
    
    if (pendingCount > 0) {
      return hasNewSubmissions 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-yellow-600 dark:text-yellow-400';
    }
    
    return 'text-green-600 dark:text-green-400';
  };

  const getBadgeColor = () => {
    if (pendingCount === 0) return '';
    
    return hasNewSubmissions 
      ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700'
      : 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-md transition-colors
        hover:bg-gray-100 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${className}
      `}
      title={`คลิกเพื่อดูหน้าการอนุมัติ - ${getDisplayText()}`}
      disabled={loading}
    >
      {/* Status Icon */}
      <span className={getStatusColor()}>
        {getStatusIcon()}
      </span>

      {/* Status Text for Desktop */}
      <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
        {getDisplayText()}
      </span>

      {/* Count Badge */}
      {pendingCount > 0 && (
        <span className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
          ${getBadgeColor()}
        `}>
          {pendingCount}
          {hasNewSubmissions && (
            <span className="ml-1 animate-pulse">
              🔴
            </span>
          )}
        </span>
      )}

      {/* Mobile: Only show count if greater than 0 */}
      {pendingCount > 0 && (
        <span className="md:hidden text-sm font-medium text-gray-700 dark:text-gray-300">
          {pendingCount}
        </span>
      )}
    </button>
  );
};