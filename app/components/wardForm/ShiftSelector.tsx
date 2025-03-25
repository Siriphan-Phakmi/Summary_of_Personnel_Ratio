'use client';

import React from 'react';
import { Shift } from '@/app/types/ward';

interface ShiftSelectorProps {
  selectedShift: Shift;
  onShiftChange: (shift: Shift) => void;
  morningDisabled?: boolean;
  nightDisabled?: boolean;
}

export default function ShiftSelector({
  selectedShift,
  onShiftChange,
  morningDisabled = false,
  nightDisabled = false
}: ShiftSelectorProps) {
  const getCurrentShift = (): Shift => {
    const now = new Date();
    const hour = now.getHours();
    // Morning shift: 7:00 - 18:59, Night shift: 19:00 - 6:59
    return (hour >= 7 && hour < 19) ? 'morning' : 'night';
  };

  const handleShiftChange = (shift: Shift) => {
    if ((shift === 'morning' && morningDisabled) || (shift === 'night' && nightDisabled)) {
      return;
    }
    onShiftChange(shift);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Shift
      </label>
      <div className="flex rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => handleShiftChange('morning')}
          disabled={morningDisabled}
          className={`relative flex-1 py-2 px-4 text-sm font-medium rounded-l-md focus:z-10 focus:outline-none ${
            selectedShift === 'morning'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${
            morningDisabled
              ? 'opacity-50 cursor-not-allowed'
              : ''
          } border border-gray-300 dark:border-gray-600`}
        >
          Morning Shift
          <span className="block text-xs text-gray-200 dark:text-gray-400">
            07:00 - 18:59
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleShiftChange('night')}
          disabled={nightDisabled}
          className={`relative flex-1 py-2 px-4 text-sm font-medium rounded-r-md focus:z-10 focus:outline-none ${
            selectedShift === 'night'
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${
            nightDisabled
              ? 'opacity-50 cursor-not-allowed'
              : ''
          } border border-gray-300 dark:border-gray-600`}
        >
          Night Shift
          <span className="block text-xs text-gray-200 dark:text-gray-400">
            19:00 - 06:59
          </span>
        </button>
      </div>
      {morningDisabled && selectedShift === 'morning' && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Morning shift has been finalized and cannot be edited.
        </p>
      )}
      {nightDisabled && selectedShift === 'night' && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Morning shift must be approved before night shift can be entered.
        </p>
      )}
    </div>
  );
} 