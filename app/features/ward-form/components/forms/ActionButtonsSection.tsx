'use client';

import React from 'react';
import { Button } from '@/app/components/ui';
import { FiSave, FiCheckSquare } from 'react-icons/fi';
import { ShiftType } from '@/app/features/ward-form/types/ward';

interface ActionButtonsSectionProps {
  isFormReadOnly: boolean;
  selectedShift: ShiftType;
  isFormSaving: boolean;
  isFormDirty: boolean;
  onSaveDraft: () => void;
  onSaveFinal: () => void;
  isFormValid: boolean;
}

export const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  isFormReadOnly,
  selectedShift,
  isFormSaving,
  isFormDirty,
  onSaveDraft,
  onSaveFinal,
  isFormValid,
}) => {
  if (isFormReadOnly) return null;

  const shiftText = selectedShift === ShiftType.MORNING ? 'เวรเช้า' : 'เวรดึก';

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mt-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        {/* Save Draft Button */}
        <Button
          variant="secondary"
          onClick={onSaveDraft}
          disabled={isFormSaving || !isFormDirty}
          isLoading={isFormSaving}
          className="flex-1 sm:flex-none"
          title={isFormDirty ? "บันทึกเป็นร่าง" : "ไม่มีการเปลี่ยนแปลงข้อมูล"}
        >
          <FiSave className="mr-2" />
          บันทึกร่าง
        </Button>

        {/* Finalize Button */}
        <Button
          variant="primary"
          onClick={onSaveFinal}
          disabled={isFormSaving || !isFormValid}
          isLoading={isFormSaving}
          className="flex-1 sm:flex-none"
          title={isFormValid ? `ส่งข้อมูล${shiftText}เพื่อขออนุมัติ` : "กรุณากรอกข้อมูลให้ครบถ้วนก่อน"}
        >
          <FiCheckSquare className="mr-2" />
          ส่งข้อมูล{shiftText}
        </Button>
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          หมายเหตุ: สามารถกรอกค่า 0 ได้ แต่ไม่สามารถกรอกค่าว่างได้ เพราะระบบจะบันทึกเป็น 0 อัตโนมัติ
        </p>
      </div>
    </div>
  );
};

export default ActionButtonsSection; 