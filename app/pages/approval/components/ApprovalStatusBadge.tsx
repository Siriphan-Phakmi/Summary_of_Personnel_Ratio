'use client';

import React from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle, FiLock } from 'react-icons/fi';
import { ApprovalStatus } from '@/app/types/ward';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
}

const ApprovalStatusBadge: React.FC<ApprovalStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <FiCheckCircle className="mr-1" />
          Approved
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <FiClock className="mr-1" />
          Pending
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <FiAlertCircle className="mr-1" />
          Rejected
        </span>
      );
    case 'locked':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          <FiLock className="mr-1" />
          Locked
        </span>
      );
    default:
      return null;
  }
};

export default ApprovalStatusBadge; 