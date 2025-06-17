'use client';

import React, { ChangeEvent, FocusEvent } from 'react';
import { Input } from './ui';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { FormConfiguration } from '@/app/features/config/types';
import { twMerge } from 'tailwind-merge';

// Component for showing patient census calculation dashboard
const PatientCensusDisplay: React.FC<{
  formData: Partial<WardForm>;
  selectedShift: ShiftType;
  config: FormConfiguration | null;
}> = ({ formData, selectedShift, config }) => {

  const labels = config?.labels || {};
  const helpers = config?.helpers || {};
  const sections = config?.sections || {};

  const safeNumber = (value: any): number => {
    if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  const admissions = safeNumber(formData.admitted) + safeNumber(formData.transferredIn);
  const discharges = safeNumber(formData.discharged) + safeNumber(formData.transferredOut) + safeNumber(formData.deaths);
  
  // For the morning shift, the starting census is the previous night's final census.
  // For the night shift, it's the current morning shift's census.
  // We'll just display the current patientCensus as the base for this calculation view.
  const startingCensus = safeNumber(formData.patientCensus);
  
  const expectedCensus = Math.max(0, startingCensus + admissions - discharges);
  
  const resultLabel = selectedShift === ShiftType.MORNING 
    ? (labels.censusDisplayResultMorning || 'คงเหลือ (เวรเช้า):') 
    : (labels.censusDisplayResultNight || 'คงเหลือ (เวรดึก):');

  return (
    <div 
      id="patient-census-display"
      className="mt-1 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm border border-blue-200 dark:border-blue-800 shadow-sm"
    >
      <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">{sections.calculation || 'ภาพรวมการคำนวณ'}</h5>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-700 dark:text-gray-300">
        <div>{labels.censusDisplayStart || 'เริ่มต้น:'}</div>
        <div className="font-medium">{startingCensus}</div>
        
        <div>{labels.censusDisplayAdmissions || 'รับเข้า/ย้ายเข้า (+):'}</div>
        <div className="font-medium text-green-600 dark:text-green-400">{admissions > 0 ? `+${admissions}` : '0'}</div>
        
        <div>{labels.censusDisplayDischarges || 'จำหน่าย/ย้ายออก/เสียชีวิต (-):'}</div>
        <div className="font-medium text-red-600 dark:text-red-400">{discharges > 0 ? `-${discharges}` : '0'}</div>
        
        <div className="font-semibold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">{resultLabel}</div>
        <div className="font-semibold text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">{expectedCensus}</div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-1">
        {helpers.calculationFormula || 'สูตร: เริ่มต้น + รับเข้า - จำหน่าย = คงเหลือ'}
      </div>
    </div>
  );
};

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
      required: type === 'number',
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
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{sections.admissionsDischarges || 'Admissions / Discharges'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
          <Input {...createInputProps('admitted', labels.admitted || 'Admitted (รับใหม่/รับส่งต่อ)')} />
          <Input {...createInputProps('transferredIn', labels.transferredIn || 'Transferred In (ย้ายเข้า)')} />
          <Input {...createInputProps('discharged', labels.discharged || 'Discharged (จำหน่าย)')} />
          <Input {...createInputProps('transferredOut', labels.transferredOut || 'Transferred Out (ย้ายออก)')} />
          <Input {...createInputProps('deaths', labels.deaths || 'Deaths (เสียชีวิต)')} />
          <Input {...createInputProps('onLeave', labels.onLeave || 'On Leave (ลา)')} />
          <Input {...createInputProps('absconded', labels.absconded || 'Absconded (หนี)')} />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{sections.bedStatus || 'Bed Status'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
          <Input {...createInputProps('totalBeds', labels.totalBeds || 'Total Beds (เตียงทั้งหมด)')} />
          <Input {...createInputProps('occupiedBeds', labels.occupiedBeds || 'Occupied Beds (เตียงที่มีผู้ป่วย)')} />
          <Input {...createInputProps('availableBeds', labels.availableBeds || 'Available Beds (เตียงว่าง)')} />
          <Input {...createInputProps('specialCareBeds', labels.specialCareBeds || 'Special Care Beds (เตียงดูแลพิเศษ)', placeholders.defaultNumber || '0', 'number')} />
          <Input {...createInputProps('isolationBeds', labels.isolationBeds || 'Isolation Beds (เตียงแยกโรค)', placeholders.defaultNumber || '0', 'number')} />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <label htmlFor="comment" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {labels.comment || 'Comment (หมายเหตุ)'}
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          value={(formData as any).comment ?? ''}
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