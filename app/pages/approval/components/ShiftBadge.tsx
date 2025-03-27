'use client';

import React from 'react';
import { Shift } from '@/app/types/ward';

interface ShiftBadgeProps {
  shift: Shift;
}

const ShiftBadge: React.FC<ShiftBadgeProps> = ({ shift }) => {
  switch (shift) {
    case 'morning':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Morning
        </span>
      );
    case 'night':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
          Night
        </span>
      );
    default:
      return null;
  }
};

export default ShiftBadge; 