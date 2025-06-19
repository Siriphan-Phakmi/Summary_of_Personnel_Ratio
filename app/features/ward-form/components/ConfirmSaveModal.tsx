'use client';

import React from 'react';
import { Modal } from './ui';
import { Button } from '@/app/components/ui/Button';
import { WardForm } from '@/app/features/ward-form/types/ward';
import { formatTimestamp } from '@/app/lib/utils/dateUtils';
import { formatShift } from '../utils/formatUtils';

// Define structure for displaying summary data
type SummaryField = {
  label: string;
  value: (data: Partial<WardForm>) => React.ReactNode;
};

const summaryFields: SummaryField[] = [
  { label: 'วอร์ด:', value: (data) => data.wardName || '-' },
  { label: 'วันที่:', value: (data) => formatTimestamp(data.date) },
  { label: 'เวร:', value: (data) => formatShift(data.shift) },
  { label: 'Patient Census:', value: (data) => data.patientCensus ?? '-' },
  { label: 'Admitted:', value: (data) => data.admitted ?? '-' },
  { label: 'Discharged:', value: (data) => data.discharged ?? '-' },
  { label: 'ผู้บันทึก:', value: (data) => `${data.recorderFirstName || ''} ${data.recorderLastName || ''}`.trim() || '-' },
];

interface ConfirmSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: Partial<WardForm>;
  isSaving: boolean;
}

const ConfirmSaveModal: React.FC<ConfirmSaveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  formData,
  isSaving,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ยืนยันการบันทึกทับข้อมูลร่างเดิม">
      <div className="mb-4 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm">พบข้อมูลร่างที่บันทึกไว้ก่อนหน้านี้สำหรับวันและเวรเดียวกัน คุณต้องการบันทึกทับหรือไม่?</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="border rounded p-4 bg-gray-50 dark:bg-gray-700">
          <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">ข้อมูลที่จะบันทึกทับ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {summaryFields.map(field => (
              <p key={field.label}>
                <strong className="mr-2">{field.label}</strong>
                {field.value(formData)}
              </p>
            ))}
          </div>
        </div>

        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800 text-sm">
          <p>⚠️ การบันทึกทับจะเป็นการแทนที่ข้อมูลร่างเดิมทั้งหมด และไม่สามารถย้อนกลับได้</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          ยกเลิก
        </Button>
        <Button 
          variant="primary" 
          onClick={onConfirm} 
          isLoading={isSaving}
          loadingText="กำลังบันทึก..."
        >
          ยืนยันบันทึกทับ
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmSaveModal; 