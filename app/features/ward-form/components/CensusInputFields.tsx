'use client';

import React, { ChangeEvent, FocusEvent } from 'react';
import { Input } from '@/app/components/ui';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { FormConfiguration } from '@/app/features/config/types';
import { WardFieldLabels, FieldCategories } from '../hooks/wardFieldLabels';
import { twMerge } from 'tailwind-merge';
import PatientCensusDisplay from './PatientCensusDisplay';

// 🏥 **HOSPITAL FIELD CONFIGURATION** - Based on BB's Standards
type InputFieldConfig = {
  name: keyof WardForm;
  label: string;
  placeholder: string;
  type: 'number' | 'text';
  category: string;
};

// ✅ **Field Configuration by Categories** - Hospital Standards
const createFieldsFromCategories = (): InputFieldConfig[] => {
  const fields: InputFieldConfig[] = [];
  
  // 👥 Personnel/Positions (บุคลากร/ตำแหน่งงาน)
  FieldCategories.PERSONNEL.fields.forEach(field => {
    fields.push({
      name: field,
      label: WardFieldLabels[field] || field,
      placeholder: '', // ใช้ค่าว่างแทน '0'
      type: 'number',
      category: 'personnel'
    });
  });
  
  // 🚶‍♂️ Patient Flow/Movement (การเคลื่อนไหวผู้ป่วย)
  FieldCategories.PATIENT_FLOW.fields.forEach(field => {
    fields.push({
      name: field,
      label: WardFieldLabels[field] || field,
      placeholder: '', // ใช้ค่าว่างแทน '0'
      type: 'number',
      category: 'patient_flow'
    });
  });
  
  // 🛏️ Bed/Room Status (สถานะเตียง/ห้อง)
  FieldCategories.BED_STATUS.fields.forEach(field => {
    fields.push({
      name: field,
      label: WardFieldLabels[field] || field,
      placeholder: '', // ใช้ค่าว่างแทน '0'
      type: 'number',
      category: 'bed_status'
    });
  });
  
  // 👤 Recorder (เจ้าหน้าที่ผู้บันทึก) - ✅ **Updated placeholders as requested by BB**
  FieldCategories.RECORDER.fields.forEach(field => {
    if (field === 'recorderFirstName') {
      fields.push({
        name: field,
        label: WardFieldLabels[field] || field,
        placeholder: 'ใส่ชื่อ', // ✅ BB's requirement: placeholder ใส่ชื่อ
        type: 'text',
        category: 'recorder'
      });
    } else if (field === 'recorderLastName') {
      fields.push({
        name: field,
        label: WardFieldLabels[field] || field,
        placeholder: 'ใส่นามสกุล', // ✅ BB's requirement: placeholder ใส่นามสกุล
        type: 'text',
        category: 'recorder'
      });
    }
  });
  
  return fields;
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

  const isMorningShift = selectedShift === ShiftType.MORNING;
  const patientCensusReadOnly = isReadOnly || (isMorningShift && isCensusAutoCalculated);
  const configuredFields = createFieldsFromCategories();

  const createInputProps = (field: InputFieldConfig) => {
    const fieldNameStr = field.name as string;
    const readOnly = isReadOnly || (field.name === 'patientCensus' && patientCensusReadOnly);
    const isDraftAndEditable = isDraftLoaded && !readOnly;
    
    // Security: Draft state โหลดจาก Firebase เท่านั้น (ไม่ใช้ cache)
    

    // ✅ **Dynamic Placeholder Logic**
    // 1. Use placeholder from `formConfig` if available.
    // 2. Fallback to the hardcoded placeholder in `field` object.
    const placeholderText = 
      formConfig?.placeholders?.[fieldNameStr] ?? field.placeholder;

    let displayValue: string | number = '';
    const rawValue = formData[field.name as keyof typeof formData];
    
    if (field.type === 'number') {
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
      label: field.label,
      value: displayValue,
      onChange: handleChange,
      onBlur: handleBlur,
      error: errors[fieldNameStr],
      placeholder: placeholderText, // ✅ Use dynamic placeholder
      type: field.type,
      readOnly: readOnly,
      className: (() => {
        const baseClasses = "form-input";
        const classes = [];
        
        // ✅ **Priority-based CSS Class Management** - BB's Draft Styling Fix
        if (isDraftAndEditable) {
          // Draft state has highest priority - yellow background
          classes.push("!bg-yellow-100 dark:!bg-yellow-900/50 !border-yellow-300 dark:!border-yellow-600");
        } else if (readOnly) {
          // Read-only state - gray background
          classes.push("bg-gray-100 dark:bg-gray-700");
        }
        
        if (readOnly) {
          classes.push("cursor-not-allowed");
        }
        
        if (errors[fieldNameStr]) {
          classes.push("!border-red-500 dark:!border-red-400");
        }
        
        const finalClasses = twMerge(baseClasses, ...classes);
        
        return finalClasses;
      })(),
      min: field.type === 'number' ? "0" : undefined,
      inputMode: field.type === 'number' ? "numeric" as const : undefined,
      pattern: field.type === 'number' ? "[0-9]*" : undefined,
      required: true,
    };
  };

  const patientCensusLabel = patientCensusReadOnly 
    ? 'Patient Census - แสดงผลเท่านั้น' 
    : 'Patient Census';

  // 🏷️ Group fields by category
  const personnelFields = configuredFields.filter(f => f.category === 'personnel');
  const patientFlowFields = configuredFields.filter(f => f.category === 'patient_flow');
  const bedStatusFields = configuredFields.filter(f => f.category === 'bed_status');
  const recorderFields = configuredFields.filter(f => f.category === 'recorder');

  return (
    <>
      {/* 🏥 Patient Census Section - Auto-calculated display */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          📊 {FieldCategories.PATIENT_CENSUS.title}
        </h4>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              id="patientCensus"
              name="patientCensus"
              label={patientCensusLabel}
              value={formData.patientCensus ? String(formData.patientCensus) : ''}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.patientCensus}
              placeholder={formConfig?.placeholders?.patientCensus ?? "0"}
              type="number"
              readOnly={patientCensusReadOnly}
              className={twMerge(
                "form-input",
                patientCensusReadOnly && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
                isDraftLoaded && !patientCensusReadOnly && "bg-yellow-100 dark:bg-yellow-900/50",
                errors.patientCensus && "!border-red-500 dark:!border-red-400"
              )}
              min="0"
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            {patientCensusReadOnly && isCensusAutoCalculated && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                * ค่านี้คำนวณจากยอดคงเหลือของเวรดึกคืนก่อน
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

      {/* 👥 Personnel/Positions Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          👥 {FieldCategories.PERSONNEL.title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {personnelFields.map(field => (
            <Input key={field.name} {...createInputProps(field)} />
          ))}
        </div>
      </div>

      {/* 🚶‍♂️ Patient Flow/Movement Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          🚶‍♂️ {FieldCategories.PATIENT_FLOW.title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {patientFlowFields.map(field => (
            <Input key={field.name} {...createInputProps(field)} />
          ))}
        </div>
      </div>

      {/* 🛏️ Bed/Room Status Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          🛏️ {FieldCategories.BED_STATUS.title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {bedStatusFields.map(field => (
            <Input key={field.name} {...createInputProps(field)} />
          ))}
        </div>
      </div>

      {/* 📝 Comment Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div>
          <label htmlFor="comment" className="form-label mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            📝 {WardFieldLabels.comment}
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            value={formData.comment ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            readOnly={isReadOnly}
            placeholder="ใส่หมายเหตุ..."
            className={twMerge(
              "form-input w-full resize-none",
              isReadOnly && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
              isDraftLoaded && !isReadOnly && "bg-yellow-100 dark:bg-yellow-900/50",
              errors.comment && "border-red-500 dark:border-red-400"
            )}
          />
          {errors.comment && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.comment}</p>}
        </div>
      </div>

      {/* 👤 Recorder Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          👤 {FieldCategories.RECORDER.title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recorderFields.map(field => (
            <Input key={field.name} {...createInputProps(field)} />
          ))}
        </div>
      </div>
    </>
  );
};

export default CensusInputFields; 