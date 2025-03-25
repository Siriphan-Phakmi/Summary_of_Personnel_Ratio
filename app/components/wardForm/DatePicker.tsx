'use client';

import React, { useState, useEffect } from 'react';
import { format, isValid, parse } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import { Popover } from '@headlessui/react';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  disabled?: boolean;
  disabledDates?: Date[];
}

export default function DatePicker({
  selectedDate,
  onDateChange,
  disabled = false,
  disabledDates = []
}: DatePickerProps) {
  const [month, setMonth] = useState<Date>(selectedDate);

  useEffect(() => {
    // Update the visible month when selected date changes
    if (isValid(selectedDate)) {
      setMonth(selectedDate);
    }
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date && !disabled) {
      onDateChange(date);
    }
  };

  // Create CSS for the date picker
  const customCSS = `
    .rdp {
      --rdp-cell-size: 40px;
      --rdp-accent-color: #2563eb;
      --rdp-background-color: #e0e7ff;
      margin: 0;
    }
    .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
      background-color: var(--rdp-accent-color);
      color: white;
    }
    .dark .rdp-day {
      color: #e5e7eb;
    }
    .dark .rdp-day_disabled, .dark .rdp-day_outside {
      color: #6b7280;
    }
    .dark .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
      background-color: #374151;
    }
    .dark .rdp-head_cell {
      color: #d1d5db;
    }
    .dark .rdp-caption_label {
      color: #f3f4f6;
    }
  `;

  return (
    <div className="relative">
      <style>{customCSS}</style>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Date
      </label>
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              disabled={disabled}
              className={`w-full flex justify-between items-center px-3 py-2 border ${
                disabled
                  ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800'
              } border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left text-gray-900 dark:text-white sm:text-sm`}
            >
              <span>{format(selectedDate, 'yyyy-MM-dd')}</span>
              <div className="flex items-center">
                <FiCalendar className="mr-2 h-5 w-5 text-gray-400" />
                <FiChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </Popover.Button>

            <Popover.Panel className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg">
              <div className="p-2">
                <DayPicker
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={[
                    ...disabledDates,
                    { before: new Date(2000, 0, 1) } // Prevent selection of dates before 2000-01-01
                  ]}
                  showOutsideDays
                  captionLayout="dropdown"
                />
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>

      {disabled && (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
          Date selection is locked because this form has been finalized.
        </p>
      )}
    </div>
  );
} 