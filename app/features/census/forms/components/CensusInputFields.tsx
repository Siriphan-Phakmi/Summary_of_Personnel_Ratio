'use client';

import React, { ChangeEvent } from 'react';
import Input from '@/app/core/ui/Input'; // Assuming Input component exists
import { WardForm } from '@/app/core/types/ward';
import { ShiftType } from '@/app/core/types/user';
import { twMerge } from 'tailwind-merge';

interface CensusInputFieldsProps {
  formData: Partial<WardForm>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  isReadOnly: boolean; // Make fields read-only (e.g., after final save)
  selectedShift: ShiftType;
  isMorningCensusReadOnly: boolean; // Specifically for morning patient census
  isCensusAutoCalculated: boolean; // <-- Add the new prop type
  isDraftLoaded: boolean; // <-- Add prop
}

const CensusInputFields: React.FC<CensusInputFieldsProps> = ({
  formData,
  handleChange,
  errors,
  isReadOnly,
  selectedShift,
  isMorningCensusReadOnly,
  isCensusAutoCalculated, // <-- Destructure the new prop
  isDraftLoaded, // <-- Destructure prop
}) => {

  const isMorningShift = selectedShift === ShiftType.MORNING;
  const patientCensusReadOnly = isReadOnly || (isMorningShift && isMorningCensusReadOnly);

  // Helper function to create input props
  const createInputProps = (fieldName: keyof WardForm, label: string, placeholder: string = '0', type: string = 'number') => ({
    id: fieldName,
    name: fieldName,
    label: label,
    value: formData[fieldName]?.toString() ?? '',
    onChange: handleChange,
    error: errors[fieldName],
    placeholder: placeholder,
    type: type,
    readOnly: isReadOnly,
    className: "form-input", // Assuming a standard input style class
    min: type === 'number' ? "0" : undefined,
    inputMode: type === 'number' ? "numeric" as const : undefined,
    pattern: type === 'number' ? "[0-9]*" : undefined,
  });

  return (
    <>
      {/* Patient Census - Special ReadOnly condition for Morning */}
      <div className="mb-6">
        <Input
          {...createInputProps('patientCensus', 'Patient Census (คงพยาบาล)')}
          readOnly={patientCensusReadOnly}
          // Apply different styling if readOnly specifically for patient census
          // Removed border and ring focus when read-only
          className={twMerge(
             "form-input",
             patientCensusReadOnly && "bg-gray-100 dark:bg-gray-800/50 border-transparent focus:border-transparent focus:ring-0 text-gray-700 dark:text-gray-300 cursor-not-allowed",
             !patientCensusReadOnly && "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
           )}
        />
        {/* Display explanation if census is auto-calculated and read-only */}
        {patientCensusReadOnly && isCensusAutoCalculated && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            * ค่านี้คำนวณจากยอดคงเหลือของกะดึกคืนก่อน
          </p>
        )}
      </div>

      {/* Nursing Staff - Grouped */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Nursing Staff</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
          <Input {...createInputProps('nurseManager', 'Nurse Manager')} />
          <Input {...createInputProps('rn', 'RN (พยาบาลวิชาชีพ)')} />
          <Input {...createInputProps('pn', 'PN (พยาบาลเทคนิค)')} />
          <Input {...createInputProps('wc', 'WC (ผู้ช่วยเหลือคนไข้)')} />
        </div>
      </div>

      {/* Admissions - Grouped */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Admissions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
          <Input {...createInputProps('newAdmit', 'New Admit (รับใหม่)')} />
          <Input {...createInputProps('transferIn', 'Transfer In (ย้ายเข้า)')} />
          <Input {...createInputProps('referIn', 'Refer In (รับส่งต่อ)')} />
        </div>
      </div>

      {/* Discharges - Grouped */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
         <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Discharges / Transfers / Others</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
          <Input {...createInputProps('transferOut', 'Transfer Out (ย้ายออก)')} />
          <Input {...createInputProps('referOut', 'Refer Out (ส่งต่อ)')} />
          <Input {...createInputProps('discharge', 'Discharge (จำหน่าย)')} />
          <Input {...createInputProps('dead', 'Dead (เสียชีวิต)')} />
        </div>
      </div>

      {/* Bed Status - Grouped */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Bed Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
          <Input {...createInputProps('available', 'Available Beds (เตียงว่าง)')} />
          <Input {...createInputProps('unavailable', 'Unavailable Beds (เตียงไม่ว่าง)')} />
          <Input {...createInputProps('plannedDischarge', 'Planned Discharge (วางแผนจำหน่าย)')} />
        </div>
      </div>

      {/* Comment */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <label htmlFor="comment" className="form-label">Comment (หมายเหตุ)</label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          value={formData.comment ?? ''}
          onChange={handleChange}
          readOnly={isReadOnly}
          placeholder="รายละเอียดเพิ่มเติม"
          className={`form-input resize-none ${errors.comment ? 'border-red-500' : ''} ${isReadOnly ? 'bg-gray-100 dark:bg-gray-800/50 border-transparent focus:border-transparent focus:ring-0 text-gray-700 dark:text-gray-300 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {errors.comment && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.comment}</p>}
      </div>
    </>
  );
};

export default CensusInputFields; 