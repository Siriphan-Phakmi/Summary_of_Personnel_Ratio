'use client';

import React from 'react';
import Modal from '@/app/core/ui/Modal';
import { Button } from '@/app/core/ui';
import { FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';

interface ConfirmZeroValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fieldsWithZero: string[];
  isSaving?: boolean;
}

const ConfirmZeroValuesModal: React.FC<ConfirmZeroValuesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fieldsWithZero,
  isSaving = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ยืนยันการบันทึกข้อมูล" titleIcon={FiInfo}>
      <div className="p-6 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start mb-4">
          <FiInfo className="h-6 w-6 text-blue-500 mr-2" aria-hidden="true" />
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
            พบฟิลด์ที่มีค่าเป็น 0
          </h3>
        </div>
        <div className="mt-2 mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            คุณกำลังบันทึกข้อมูลที่มีค่าเป็น 0 ในฟิลด์ต่อไปนี้:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-3 rounded-md max-h-40 overflow-y-auto">
            {fieldsWithZero.map((field, index) => (
              <li key={index}>{field}</li>
            ))}
          </ul>
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>หมายเหตุ:</strong> ค่า 0 เป็นค่าที่ถูกต้องและยอมรับได้ หากคุณต้องการบันทึกค่านี้ กรุณากด "ยืนยันการบันทึก"
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
            กรุณาตรวจสอบว่าข้อมูลถูกต้องก่อนยืนยัน หากต้องการแก้ไข กรุณากด "ยกเลิก"
          </p>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isSaving}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            <FiCheckCircle className="mr-2" />
            ยืนยันการบันทึก
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto mt-3 sm:mt-0"
          >
            ยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmZeroValuesModal; 