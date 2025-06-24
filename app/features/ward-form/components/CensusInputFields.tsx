'use client';

import React, { ChangeEvent, FocusEvent } from 'react';
import { Input } from '@/app/components/ui';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { FormConfiguration } from '@/app/features/config/types';
import { twMerge } from 'tailwind-merge';
import PatientCensusDisplay from './PatientCensusDisplay';

// Define the structure for rendering input fields
type InputFieldConfig = {
  name: keyof WardForm;
  labelKey: keyof FormConfiguration['labels'];
  defaultLabel: string;
};

const admissionDischargeFields: InputFieldConfig[] = [
  { name: 'admitted', labelKey: 'admitted', defaultLabel: 'Admitted (รับใหม่)' },
  { name: 'transferredIn', labelKey: 'transferredIn', defaultLabel: 'Transferred In (ย้ายเข้า)' },
  { name: 'referIn', labelKey: 'referIn', defaultLabel: 'Refer In (รับส่งต่อ)' },
  { name: 'discharged', labelKey: 'discharged', defaultLabel: 'Discharged (จำหน่าย)' },
  { name: 'transferredOut', labelKey: 'transferredOut', defaultLabel: 'Transferred Out (ย้ายออก)' },
  { name: 'referOut', labelKey: 'referOut', defaultLabel: 'Refer Out (ส่งต่อ)' },
  { name: 'deaths', labelKey: 'deaths', defaultLabel: 'Deaths (เสียชีวิต)' },
  { name: 'onLeave', labelKey: 'onLeave', defaultLabel: 'On Leave (ลา)' },
  { name: 'absconded', labelKey: 'absconded', defaultLabel: 'Absconded (หนี)' },
];

const nurseStaffingFields: InputFieldConfig[] = [
  { name: 'nurseManager', labelKey: 'nurseManager', defaultLabel: 'Nurse Manager (หัวหน้าเวร)' },
  { name: 'rn', labelKey: 'rn', defaultLabel: 'RN (พยาบาลวิชาชีพ)' },
  { name: 'pn', labelKey: 'pn', defaultLabel: 'PN (พยาบาลเทคนิค)' },
  { name: 'wc', labelKey: 'wc', defaultLabel: 'WC (ผู้ช่วยเหลือคนไข้)' },
];

const bedStatusFields: InputFieldConfig[] = [
  { name: 'totalBeds', labelKey: 'totalBeds', defaultLabel: 'Total Beds (เตียงทั้งหมด)' },
  { name: 'occupiedBeds', labelKey: 'occupiedBeds', defaultLabel: 'Occupied Beds (เตียงที่มีผู้ป่วย)' },
  { name: 'availableBeds', labelKey: 'availableBeds', defaultLabel: 'Available Beds (เตียงว่าง)' },
  { name: 'unavailableBeds', labelKey: 'unavailableBeds', defaultLabel: 'Unavailable Beds (เตียงงดรับ)' },
  { name: 'plannedDischarge', labelKey: 'plannedDischarge', defaultLabel: 'Planned Discharge (เตียงวางแผนจำหน่าย)' },
  { name: 'specialCareBeds', labelKey: 'specialCareBeds', defaultLabel: 'Special Care Beds (เตียงดูแลพิเศษ)' },
  { name: 'isolationBeds', labelKey: 'isolationBeds', defaultLabel: 'Isolation Beds (เตียงแยกโรค)' },
];

// Helper component for rendering a section of inputs
const InputSection: React.FC<{
  fields: InputFieldConfig[];
  createInputProps: (fieldName: keyof WardForm, label: string) => any;
  labels: FormConfiguration['labels'];
}> = ({ fields, createInputProps, labels }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
    {fields.map(field => (
      <Input key={field.name} {...createInputProps(field.name, labels[field.labelKey] || field.defaultLabel)} />
    ))}
  </div>
);

interface CensusInputFieldsProps {
  formConfig: FormConfiguration | null;
  formData: Partial<WardForm>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  isReadOnly: boolean;
  selectedShift: ShiftType;
  isCensusAutoCalculated: boolean;
  isDraftLoaded: boolean;
}

const CensusInputFields: React.FC<CensusInputFieldsProps> = ({
  formConfig,
  formData,
  handleChange,
  handleBlur,
  errors,
  isReadOnly,
  selectedShift,
  isCensusAutoCalculated,
  isDraftLoaded,
}) => {

  const labels = formConfig?.labels || {};
  const placeholders = formConfig?.placeholders || {};
  const sections = formConfig?.sections || {};
  const helpers = formConfig?.helpers || {};

  const isMorningShift = selectedShift === ShiftType.MORNING;
  const patientCensusReadOnly = isReadOnly || (isMorningShift && isCensusAutoCalculated);

  const createInputProps = (fieldName: keyof WardForm, label: string, placeholder: string = '0', type: string = 'number') => {
    const fieldNameStr = fieldName as string;
    const readOnly = isReadOnly || (fieldName === 'patientCensus' && patientCensusReadOnly);
    const isDraftAndEditable = isDraftLoaded && !readOnly;

    let displayValue: string | number = '';
    const rawValue = formData[fieldName as keyof typeof formData];
    
    if (type === 'number') {
      if (rawValue === 0) {
        displayValue = "0";
      } else if (rawValue === null || rawValue === undefined || rawValue === '' || isNaN(Number(rawValue))) {
        displayValue = '';
      } else {
        displayValue = String(rawValue);
      }
    } else {
      displayValue = (rawValue as string | null | undefined) ?? '';
    }

    return {
      id: fieldNameStr,
      name: fieldNameStr,
      label: label,
      value: displayValue,
      onChange: handleChange,
      onBlur: handleBlur,
      error: errors[fieldNameStr],
      placeholder: placeholder,
      type: type,
      readOnly: readOnly,
      className: twMerge(
        "form-input",
        readOnly && "bg-gray-100 dark:bg-gray-700",
        isDraftAndEditable && "bg-yellow-100 dark:bg-yellow-900/50",
        readOnly && "cursor-not-allowed",
        errors[fieldNameStr] && "!border-red-500 dark:!border-red-400"
      ),
      min: type === 'number' ? "0" : undefined,
      inputMode: type === 'number' ? "numeric" as const : undefined,
      pattern: type === 'number' ? "[0-9]*" : undefined,
      required: true,
    };
  };

  const patientCensusLabel = patientCensusReadOnly 
    ? (labels.patientCensusReadOnly || 'Patient Census (คงพยาบาล) - แสดงผลเท่านั้น') 
    : (labels.patientCensus || 'Patient Census (คงพยาบาล)');

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              {...createInputProps('patientCensus', patientCensusLabel)}
            />
            {patientCensusReadOnly && isCensusAutoCalculated && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {helpers.patientCensusInfo || '* ค่านี้คำนวณจากยอดคงเหลือของเวรดึกคืนก่อน'}
              </p>
            )}
          </div>
          <div className="flex-1">
            <PatientCensusDisplay 
              formData={formData} 
              selectedShift={selectedShift} 
              config={formConfig}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{sections.admissionsDischarges || 'Patient Movement (การรับ-จำหน่ายผู้ป่วย)'}</h4>
        <InputSection fields={admissionDischargeFields} createInputProps={createInputProps} labels={labels} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{sections.nurseStaffing || 'Nurse Staffing (ข้อมูลเจ้าหน้าที่)'}</h4>
        <InputSection fields={nurseStaffingFields} createInputProps={createInputProps} labels={labels} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{sections.bedStatus || 'Bed Status (ข้อมูลเตียง)'}</h4>
        <InputSection fields={bedStatusFields} createInputProps={createInputProps} labels={labels} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <label htmlFor="comment" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {labels.comment || 'Comment (หมายเหตุ)'}
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          value={formData.comment ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnly={isReadOnly}
          placeholder={placeholders.comment || "รายละเอียดเพิ่มเติม (ถ้ามี)"}
          className={twMerge(
            "form-input w-full resize-none",
            isReadOnly && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
            isDraftLoaded && !isReadOnly && "bg-yellow-100 dark:bg-yellow-900/50",
            errors.comment && "border-red-500 dark:border-red-400"
          )}
        />
        {errors.comment && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.comment}</p>}
      </div>
    </>
  );
};

export default CensusInputFields; 