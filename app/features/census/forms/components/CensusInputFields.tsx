'use client';

import React, { ChangeEvent } from 'react';
import Input from '@/app/core/ui/Input'; // Assuming Input component exists
import { WardForm } from '@/app/core/types/ward';
import { ShiftType } from '@/app/core/types/user';

interface CensusInputFieldsProps {
  formData: Partial<WardForm>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  isReadOnly: boolean; // Make fields read-only (e.g., after final save)
  selectedShift: ShiftType;
  isMorningCensusReadOnly: boolean; // Specifically for morning patient census
}

const CensusInputFields: React.FC<CensusInputFieldsProps> = ({
  formData,
  handleChange,
  errors,
  isReadOnly,
  selectedShift,
  isMorningCensusReadOnly,
}) => {

  const isMorningShift = selectedShift === ShiftType.MORNING;
  const isNightShift = selectedShift === ShiftType.NIGHT;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
      {/* Patient Census - Special ReadOnly condition for Morning */}
      <Input
        {...createInputProps('patientCensus', 'Patient Census (คงพยาบาล)')}
        readOnly={patientCensusReadOnly}
        // Apply different styling if readOnly specifically for patient census
        className={patientCensusReadOnly 
          ? "form-input bg-gray-100 dark:bg-gray-800/50 border-transparent cursor-not-allowed focus-visible:ring-0 focus-visible:outline-none" 
          : "form-input"
        }
      />

      {/* Nursing Staff */}
      <Input {...createInputProps('nurseManager', 'Nurse Manager')} />
      <Input {...createInputProps('rn', 'RN (พยาบาลวิชาชีพ)')} />
      <Input {...createInputProps('pn', 'PN (พยาบาลเทคนิค)')} />
      <Input {...createInputProps('wc', 'WC (ผู้ช่วยเหลือคนไข้)')} />

      {/* Admissions */}
      <Input {...createInputProps('newAdmit', 'New Admit (รับใหม่)')} />
      <Input {...createInputProps('transferIn', 'Transfer In (ย้ายเข้า)')} />
      <Input {...createInputProps('referIn', 'Refer In (รับส่งต่อ)')} />

      {/* Discharges */}
      <Input {...createInputProps('transferOut', 'Transfer Out (ย้ายออก)')} />
      <Input {...createInputProps('referOut', 'Refer Out (ส่งต่อ)')} />
      <Input {...createInputProps('discharge', 'Discharge (จำหน่าย)')} />
      <Input {...createInputProps('dead', 'Dead (เสียชีวิต)')} />

      {/* Bed Status */}
      <Input {...createInputProps('available', 'Available Beds (เตียงว่าง)')} />
      <Input {...createInputProps('unavailable', 'Unavailable Beds (เตียงไม่ว่าง)')} />
      <Input {...createInputProps('plannedDischarge', 'Planned Discharge (วางแผนจำหน่าย)')} />

      {/* Comment - Spanning multiple columns might need adjustments */}
      <div className="md:col-span-2 lg:col-span-3">
        <label htmlFor="comment" className="form-label">Comment (หมายเหตุ)</label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          value={formData.comment ?? ''}
          onChange={handleChange}
          readOnly={isReadOnly}
          placeholder="รายละเอียดเพิ่มเติม"
          className={`form-input resize-none ${errors.comment ? 'border-red-500' : ''}`}
        />
        {errors.comment && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.comment}</p>}
      </div>
    </div>
  );
};

export default CensusInputFields; 