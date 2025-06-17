'use client';

import React from 'react';
import { Ward } from '@/app/features/ward-form/types/ward';
import { Input } from '@/app/components/ui';

interface WardSelectionSectionProps {
  wards: Ward[];
  selectedWard: string;
  selectedDate: string;
  selectedWardObject?: Ward;
  onWardChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WardSelectionSection: React.FC<WardSelectionSectionProps> = ({
  wards,
  selectedWard,
  selectedDate,
  selectedWardObject,
  onWardChange,
  onDateChange,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        เลือกแผนกและวันที่
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ward Selection */}
        <div>
          <label htmlFor="ward" className="form-label block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            แผนก (Ward) *
          </label>
          <select
            id="ward"
            value={selectedWard}
            onChange={onWardChange}
            className="form-input"
            required
          >
            <option value="">เลือกแผนก</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
          {selectedWardObject && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              รหัสแผนก: {selectedWardObject.id}
            </p>
          )}
        </div>

        {/* Date Selection */}
        <Input
          id="date"
          name="date"
          label="วันที่ (Date) *"
          type="date"
          value={selectedDate}
          onChange={onDateChange}
          required
        />
      </div>
    </div>
  );
};

export default WardSelectionSection; 