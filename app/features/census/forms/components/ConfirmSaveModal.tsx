'use client';

import React from 'react';
import Button from '@/app/core/ui/Button'; // Assuming Button component exists
import { WardForm } from '@/app/core/types/ward';
import { Timestamp } from 'firebase/firestore';

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

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '-';
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">ยืนยันการบันทึกข้อมูล (ร่าง)</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">กรุณาตรวจสอบข้อมูลก่อนกดบันทึกทับข้อมูลร่างเดิม</p>

        <div className="space-y-3 mb-6 border rounded p-4 bg-gray-50 dark:bg-gray-700">
          <p><strong>วอร์ด:</strong> {formData.wardName || '-'}</p>
          <p><strong>วันที่:</strong> {formatTimestamp(formData.date)}</p>
          <p><strong>กะ:</strong> {formData.shift === 'morning' ? 'เช้า' : 'ดึก'}</p>
          <p><strong>ผู้ป่วยคงพยาบาล:</strong> {formData.patientCensus ?? '-'}</p>
          {/* Add more fields as needed for confirmation */}
          <p><strong>ผู้บันทึก:</strong> {formData.recorderFirstName || ''} {formData.recorderLastName || ''}</p>
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
            บันทึกทับข้อมูลร่างเดิม
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSaveModal; 