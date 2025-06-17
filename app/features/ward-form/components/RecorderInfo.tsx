'use client';

import React, { ChangeEvent } from 'react';
import { Input } from './ui';
import { twMerge } from 'tailwind-merge';

interface RecorderInfoProps {
  firstName: string;
  lastName: string;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  isReadOnly: boolean;
  isDraftLoaded: boolean;
}

const RecorderInfo: React.FC<RecorderInfoProps> = ({
  firstName,
  lastName,
  handleChange,
  errors,
  isReadOnly,
  isDraftLoaded,
}) => {
  const applyDraftStyle = isDraftLoaded && !isReadOnly; // Use this flag to determine when to apply draft styling

  return (
    <div className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">เจ้าหน้าที่ผู้บันทึก (Recorder)*</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="recorderFirstName"
          name="recorderFirstName"
          label="ชื่อ (First Name)"
          value={firstName}
          onChange={handleChange}
          error={errors.recorderFirstName}
          placeholder="กรอกชื่อ"
          readOnly={isReadOnly}
          className={twMerge(
            "form-input", 
            isReadOnly && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
            applyDraftStyle && "bg-yellow-100 dark:bg-yellow-900/50" // Apply draft styling
          )}
        />
        <Input
          id="recorderLastName"
          name="recorderLastName"
          label="นามสกุล (Last Name)"
          value={lastName}
          onChange={handleChange}
          error={errors.recorderLastName}
          placeholder="กรอกนามสกุล"
          readOnly={isReadOnly}
          className={twMerge(
            "form-input", 
            isReadOnly && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
            applyDraftStyle && "bg-yellow-100 dark:bg-yellow-900/50" // Apply draft styling
          )}
        />
      </div>
    </div>
  );
};

export default RecorderInfo; 