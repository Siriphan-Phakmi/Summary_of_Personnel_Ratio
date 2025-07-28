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

  // 👉 Admissions = New Admit + Transfer In + Refer In
  const admissions =
    safeNumber(formData.admitted) +
    safeNumber(formData.transferredIn) +
    safeNumber(formData.referIn);

  // 👉 Discharges = Transfer Out + Refer Out + Discharge + Dead
  const discharges =
    safeNumber(formData.transferredOut) +
    safeNumber(formData.referOut) +
    safeNumber(formData.discharged) +
    safeNumber(formData.deaths);

  // ✅ สูตรที่ถูกต้อง: (รับเข้า + ย้ายเข้า + ส่งต่อเข้า) - (ย้ายออก + ส่งต่อออก + จำหน่าย + เสียชีวิต)
  const expectedCensus = Math.max(0, admissions - discharges);



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
        <div>{labels.censusDisplayAdmissions || 'รับเข้า/ย้ายเข้า/ส่งต่อเข้า (+):'}</div>
        <div className="font-medium text-green-600 dark:text-green-400">{admissions > 0 ? `+${admissions}` : '0'}</div>

        <div>{labels.censusDisplayDischarges || 'ย้ายออก/ส่งต่อออก/จำหน่าย/เสียชีวิต (-):'}</div>
        <div className="font-medium text-red-600 dark:text-red-400">{discharges > 0 ? `-${discharges}` : '0'}</div>

        <div className="font-semibold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">{resultLabel}</div>
        <div className="font-semibold text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-700 pt-1 mt-1 text-right">
          {expectedCensus}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-1">
        {helpers.calculationFormula || 'สูตร: รับเข้า - จำหน่าย = ผลต่าง'}
      </div>
    </div>
  );
};

export default PatientCensusDisplay; 