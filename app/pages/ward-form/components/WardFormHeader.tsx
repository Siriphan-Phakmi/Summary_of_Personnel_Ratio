'use client';

import React from 'react';
import { format } from 'date-fns';
import WardSelector from '@/app/components/wardForm/WardSelector';
import DatePicker from '@/app/components/wardForm/DatePicker';
import ShiftSelector from '@/app/components/wardForm/ShiftSelector';
import { Shift } from '@/app/types/ward';

interface WardFormHeaderProps {
  wardId: string;
  wardName: string;
  selectedDate: Date;
  shift: Shift;
  firstName: string;
  lastName: string;
  formStatus: string;
  onWardChange: (id: string, name: string) => void;
  onDateChange: (date: Date) => void;
  onShiftChange: (shift: Shift) => void;
}

const WardFormHeader: React.FC<WardFormHeaderProps> = ({
  wardId,
  wardName,
  selectedDate,
  shift,
  firstName,
  lastName,
  formStatus,
  onWardChange,
  onDateChange,
  onShiftChange
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ward Form
        </h1>
        <div className="mt-2 sm:mt-0 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium rounded-full px-3 py-1">
          Status: <span className="capitalize">{formStatus}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
        <div>
          <WardSelector
            selectedWardId={wardId}
            onWardChange={onWardChange}
            disabled={formStatus === 'final'}
          />
        </div>
        
        <div>
          <DatePicker
            selectedDate={selectedDate}
            onChange={onDateChange}
            disabled={formStatus === 'final'}
            minDate={new Date(new Date().setDate(new Date().getDate() - 14))}
            maxDate={new Date(new Date().setDate(new Date().getDate() + 1))}
          />
        </div>
        
        <div>
          <ShiftSelector
            selectedShift={shift}
            onChange={onShiftChange}
            disabled={formStatus === 'final'}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Submitted by
          </label>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-300">
            {firstName} {lastName}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        Last updated: {format(new Date(), 'dd/MM/yyyy HH:mm')}
      </div>
    </div>
  );
};

export default WardFormHeader; 