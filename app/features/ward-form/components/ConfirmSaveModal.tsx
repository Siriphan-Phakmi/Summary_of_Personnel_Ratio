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
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Create a formatted summary of key data
  const formatShift = (shift: string | undefined) => {
    if (!shift) return '-';
    return shift === 'morning' ? 'กะเช้า' : 'กะดึก';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">ยืนยันการบันทึกทับข้อมูลร่างเดิม</h2>
        <div className="mb-4 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm">พบข้อมูลร่างที่บันทึกไว้ก่อนหน้านี้สำหรับวันและกะเดียวกัน คุณต้องการบันทึกทับหรือไม่?</p>
        </div>

        <div className="space-y-4 mb-6">
          {/* ข้อมูลพื้นฐาน */}
          <div className="border rounded p-4 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">ข้อมูลที่จะบันทึกทับ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <p><strong>วอร์ด:</strong> {formData.wardName || '-'}</p>
          <p><strong>วันที่:</strong> {formatTimestamp(formData.date)}</p>
              <p><strong>กะ:</strong> {formatShift(formData.shift)}</p>
              <p><strong>Patient Census:</strong> {formData.patientCensus ?? '-'}</p>
              <p><strong>Nurse Manager:</strong> {formData.nurseManager ?? '-'}</p>
              <p><strong>RN:</strong> {formData.rn ?? '-'}</p>
          <p><strong>ผู้บันทึก:</strong> {formData.recorderFirstName || ''} {formData.recorderLastName || ''}</p>
            </div>
          </div>

          {/* ข้อความคำเตือน */}
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
      </div>
    </div>
  );
};

export default ConfirmSaveModal; 