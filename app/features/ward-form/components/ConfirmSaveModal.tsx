'use client';

import React from 'react';
import { Modal } from './ui';
import { Button } from '@/app/components/ui/Button';
import { WardForm } from '@/app/features/ward-form/types/ward';
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
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Create a formatted summary of key data
  const formatShift = (shift: any) => {
    if (!shift) return '-';
    return shift === 'morning' ? 'เวรเช้า' : 'เวรดึก';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ยืนยันการบันทึกทับข้อมูลร่างเดิม">
      <div className="mb-4 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm">พบข้อมูลร่างที่บันทึกไว้ก่อนหน้านี้สำหรับวันและเวรเดียวกัน คุณต้องการบันทึกทับหรือไม่?</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="border rounded p-4 bg-gray-50 dark:bg-gray-700">
          <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">ข้อมูลที่จะบันทึกทับ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><strong>วอร์ด:</strong> {formData.wardName || '-'}</p>
            <p><strong>วันที่:</strong> {formatTimestamp(formData.date)}</p>
            <p><strong>เวร:</strong> {formatShift(formData.shift)}</p>
            <p><strong>Patient Census:</strong> {formData.patientCensus ?? '-'}</p>
            <p><strong>Admitted:</strong> {formData.admitted ?? '-'}</p>
            <p><strong>Discharged:</strong> {formData.discharged ?? '-'}</p>
            <p><strong>ผู้บันทึก:</strong> {formData.recorderFirstName || ''} {formData.recorderLastName || ''}</p>
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