'use client';

import React, { ChangeEvent, FocusEvent } from 'react';
import Input from '@/app/core/ui/Input'; // Assuming Input component exists
import { WardForm, ShiftType } from '@/app/core/types/ward';
import { TimestampField } from '@/app/core/types/user';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Use the extended state type from useWardFormData
type WardFormDataState = Partial<Omit<WardForm, 'patientCensus' | 'nurseManager' | 'rn' | 'pn' | 'wc' | 'newAdmit' | 'transferIn' | 'referIn' | 'transferOut' | 'referOut' | 'discharge' | 'dead' | 'available' | 'unavailable' | 'plannedDischarge'> & {
    [K in 'patientCensus' | 'nurseManager' | 'rn' | 'pn' | 'wc' | 'newAdmit' | 'transferIn' | 'referIn' | 'transferOut' | 'referOut' | 'discharge' | 'dead' | 'available' | 'unavailable' | 'plannedDischarge']: string | number;
}>;

// Component for showing patient census calculation dashboard
const PatientCensusDisplay: React.FC<{
  formData: Partial<WardForm>;
  selectedShift: ShiftType;
  allowUserInput?: boolean;
}> = ({ formData, selectedShift, allowUserInput = true }) => {
  // ฟังก์ชั่นช่วยในการแปลงค่าให้เป็นตัวเลขที่ถูกต้อง (ป้องกัน NaN)
  const safeNumber = (value: any): number => {
    if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  // Calculate Admissions (newAdmit + transferIn + referIn) - ใช้ safeNumber
  const admissions = (
    safeNumber(formData.newAdmit) +
    safeNumber(formData.transferIn) + 
    safeNumber(formData.referIn)
  );

  // Calculate Discharges (discharge + transferOut + referOut + dead) - ใช้ safeNumber
  const discharges = (
    safeNumber(formData.discharge) + 
    safeNumber(formData.transferOut) + 
    safeNumber(formData.referOut) + 
    safeNumber(formData.dead)
  );

  // ค่าเริ่มต้นอาจจะมาจาก initialPatientCensus หรือ patientCensus - ใช้ safeNumber
  const startingCensus = formData.initialPatientCensus !== undefined ? 
    safeNumber(formData.initialPatientCensus) : 
    safeNumber(formData.patientCensus);
  
  // คำนวณค่าผู้ป่วยคงเหลือจากการรับเข้า-จำหน่าย
  const expectedCensus = Math.max(0, startingCensus + admissions - discharges);
  
  // ตรวจสอบว่ามีค่าที่คำนวณไว้แล้วหรือไม่
  const hasCalculatedCensus = formData.calculatedCensus !== undefined;
  
  // ใช้ค่าที่คำนวณได้หรือใช้ค่าปัจจุบัน (ถ้ามี)
  const displayCensus = hasCalculatedCensus ? safeNumber(formData.calculatedCensus) : expectedCensus;
  
  // ตรวจสอบว่ามีความแตกต่างระหว่างค่าที่คำนวณได้กับค่าที่แสดง
  const hasDifference = expectedCensus !== displayCensus;

  // ข้อความแสดงผลขึ้นอยู่กับเวรที่เลือก
  const resultLabel = selectedShift === ShiftType.MORNING ? 'คงเหลือ (เวรเช้า):' : 'คงเหลือ (เวรดึก):';

  // ฟังก์ชันสำหรับรีเฟรชค่า (จริงๆ แล้วจะไม่ทำอะไร เพราะแสดงตามค่าที่กรอกอยู่แล้ว)
  const handleRefresh = () => {
    // แค่ทำเอฟเฟกต์ว่ามีการรีเฟรช
    const element = document.getElementById('patient-census-display');
    if (element) {
      element.classList.add('bg-blue-100');
      setTimeout(() => {
        element.classList.remove('bg-blue-100');
      }, 300);
    }
  };

  return (
    <div 
      id="patient-census-display"
      className="mt-1 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm border border-blue-200 dark:border-blue-800 shadow-sm transition-colors duration-300"
    >
      <div className="flex justify-between items-center mb-2">
        <h5 className="font-medium text-blue-700 dark:text-blue-300">การคำนวณ Patient Census</h5>
        <button 
          onClick={handleRefresh}
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          title="รีเฟรชการคำนวณ"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-700 dark:text-gray-300">
        <div>เริ่มต้น:</div>
        <div className="font-medium">{startingCensus}</div>
        
        <div>รับเข้า (+):</div>
        <div className="font-medium text-green-600 dark:text-green-400">{admissions > 0 ? `+${admissions}` : '0'}</div>
        
        <div>จำหน่าย (-):</div>
        <div className="font-medium text-red-600 dark:text-red-400">{discharges > 0 ? `-${discharges}` : '0'}</div>
        
        <div className="font-semibold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">{resultLabel}</div>
        <div className="font-semibold text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">{displayCensus}</div>
        
        {/* แสดงค่าที่คำนวณได้ถ้ามีความแตกต่าง */}
        {hasDifference && (
          <>
            <div className="text-xs text-amber-600 dark:text-amber-400 pt-1">ค่าที่คำนวณได้:</div>
            <div className="text-xs text-amber-600 dark:text-amber-400 pt-1">{expectedCensus}</div>
          </>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-1">
        สูตร: เริ่มต้น + รับเข้า - จำหน่าย = คงเหลือ
        {hasDifference && (
          <div className="text-amber-600 dark:text-amber-400 mt-1 not-italic">
            <span className="font-medium">หมายเหตุ:</span> ค่าที่คำนวณได้ต่างจากค่าที่บันทึกไว้ในระบบ
          </div>
        )}
      </div>
    </div>
  );
};

interface CensusInputFieldsProps {
  formData: Partial<WardForm>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
  handleBlur,
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
  const createInputProps = (fieldName: keyof WardForm, label: string, placeholder: string = '0', type: string = 'number') => {
    const readOnly = isReadOnly || (fieldName === 'patientCensus' && patientCensusReadOnly);
    const isDraftAndEditable = isDraftLoaded && !readOnly;

    // ปรับการแสดงผลค่าในฟอร์ม
    let displayValue: string | number = '';
    const rawValue = formData[fieldName] as number | string | undefined | null;
    
    if (type === 'number') {
      // แก้ไขส่วนนี้เพื่อป้องกันค่า NaN
      if (rawValue === 0) {
        displayValue = "0";
      } else if (rawValue === null || rawValue === undefined || rawValue === '' || isNaN(Number(rawValue))) {
        // เพิ่มการตรวจสอบค่า NaN ตรงนี้
        displayValue = '';
      } else {
        displayValue = String(rawValue); // แปลงเป็น string เสมอเพื่อป้องกัน NaN error
      }
    } else {
      // Non-numeric values (string) remain unchanged
      displayValue = (rawValue as string | null | undefined) ?? '';
    }

    return {
      id: fieldName,
      name: fieldName,
      label: label,
      value: displayValue, // displayValue ตอนนี้จะไม่มีค่า NaN
      onChange: handleChange,
      onBlur: handleBlur,
      error: errors[fieldName],
      placeholder: placeholder,
      type: type,
      readOnly: readOnly,
      // Conditionally apply yellow background for drafts that are editable, and enforce red border on error
      className: twMerge(
        "form-input",
        readOnly && "bg-gray-100 dark:bg-gray-700", // Base read-only style
        isDraftAndEditable && "bg-yellow-100 dark:bg-yellow-900/50", // Draft style - highlight with yellow background
        readOnly && "cursor-not-allowed", // Add cursor style for read-only
        errors[fieldName] && "!border-red-500 dark:!border-red-400" // Error style (important to override global input border)
      ),
      min: type === 'number' ? "0" : undefined,
      inputMode: type === 'number' ? "numeric" as const : undefined,
      pattern: type === 'number' ? "[0-9]*" : undefined,
      required: type === 'number', // ทุก field ที่เป็นตัวเลขเป็น required
    };
  };

  return (
    <>
      {/* Patient Census - Special ReadOnly condition for Morning */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              {...createInputProps('patientCensus', patientCensusReadOnly ? 'Patient Census (คงพยาบาล) - แสดงผลเท่านั้น' : 'Patient Census (คงพยาบาล)')}
              className={twMerge(
                "form-input",
                 // Use the calculated readOnly state
                patientCensusReadOnly && "bg-gray-100 dark:bg-gray-800/50 border-transparent focus:border-transparent focus:ring-0 text-gray-700 dark:text-gray-300 cursor-not-allowed",
                // Apply draft style if applicable and not read-only
                isDraftLoaded && !patientCensusReadOnly && "bg-yellow-100 dark:bg-yellow-900/50",
                // Keep existing non-read-only styles
                !patientCensusReadOnly && "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400",
                 errors.patientCensus && "border-red-500 dark:border-red-400" // Keep error style
              )}
            />
            {/* Display explanation if census is auto-calculated and read-only */}
            {patientCensusReadOnly && isCensusAutoCalculated && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                * ค่านี้คำนวณจากยอดคงเหลือของเวรดึกคืนก่อน
              </p>
            )}
          </div>
          {/* New Dashboard for Patient Census Display */}
          <div className="flex-1">
            <PatientCensusDisplay 
              formData={formData} 
              selectedShift={selectedShift} 
              allowUserInput={!patientCensusReadOnly}
            />
          </div>
        </div>
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
        <label htmlFor="comment" className="form-label block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comment (หมายเหตุ)</label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          value={formData.comment ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnly={isReadOnly}
          placeholder="รายละเอียดเพิ่มเติม"
          className={twMerge(
            "form-input resize-none",
            // Apply read-only style
            isReadOnly && "bg-gray-100 dark:bg-gray-800/50 border-transparent focus:border-transparent focus:ring-0 text-gray-700 dark:text-gray-300 cursor-not-allowed",
            // Apply draft style if applicable and not read-only
            isDraftLoaded && !isReadOnly && "bg-yellow-100 dark:bg-yellow-900/50",
             // Keep existing non-read-only styles
            !isReadOnly && "border-gray-300 dark:border-gray-600",
            // Apply error style
            errors.comment && "border-red-500 dark:border-red-400 border-2" // Ensure error border is prominent
          )}
        />
        {errors.comment && <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">{errors.comment}</p>}
      </div>
    </>
  );
};

export default CensusInputFields; 