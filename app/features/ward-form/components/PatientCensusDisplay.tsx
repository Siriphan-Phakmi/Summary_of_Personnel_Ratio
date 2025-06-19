'use client';

import React from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { FormConfiguration } from '@/app/features/config/types';

interface PatientCensusDisplayProps {
  formData: Partial<WardForm>;
  selectedShift: ShiftType;
  config: FormConfiguration | null;
}

/**
 * A display component showing a summary of patient census calculations
 * based on admissions and discharges for a selected shift.
 */
const PatientCensusDisplay: React.FC<PatientCensusDisplayProps> = ({
  formData,
  selectedShift,
  config,
}) => {
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

  const startingCensus = safeNumber(formData.patientCensus);
  const expectedCensus = Math.max(0, startingCensus + admissions - discharges);

  const resultLabel =
    selectedShift === ShiftType.MORNING
      ? labels.censusDisplayResultMorning || 'คงเหลือ (เวรเช้า):'
      : labels.censusDisplayResultNight || 'คงเหลือ (เวรดึก):';

  return (
    <div
      id="patient-census-display"
      className="mt-1 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm border border-blue-200 dark:border-blue-800 shadow-sm"
    >
      <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
        {sections.calculation || 'ภาพรวมการคำนวณ'}
      </h5>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-700 dark:text-gray-300">
        <div>{labels.censusDisplayStart || 'เริ่มต้น:'}</div>
        <div className="font-medium">{startingCensus}</div>

        <div>{labels.censusDisplayAdmissions || 'รับเข้า/ย้ายเข้า (+):'}</div>
        <div className="font-medium text-green-600 dark:text-green-400">{admissions > 0 ? `+${admissions}` : '0'}</div>

        <div>{labels.censusDisplayDischarges || 'จำหน่าย/ย้ายออก/เสียชีวิต (-):'}</div>
        <div className="font-medium text-red-600 dark:text-red-400">{discharges > 0 ? `-${discharges}` : '0'}</div>

        <div className="font-semibold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">{resultLabel}</div>
        <div className="font-semibold text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
          {expectedCensus}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-1">
        {helpers.calculationFormula || 'สูตร: เริ่มต้น + รับเข้า - จำหน่าย = คงเหลือ'}
      </div>
    </div>
  );
};

export default PatientCensusDisplay; 