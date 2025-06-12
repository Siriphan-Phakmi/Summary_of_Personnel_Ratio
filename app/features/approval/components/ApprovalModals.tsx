'use client';

import React from 'react';
import Modal from '@/app/core/ui/Modal';
import Button from '@/app/core/ui/Button';
import { WardForm, ShiftType } from '@/app/core/types/ward';
import { formatTimestamp } from '@/app/core/utils/dateUtils';

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WardForm | null;
  onConfirm: () => Promise<void>;
}

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WardForm | null;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  onConfirm: () => Promise<void>;
}

export const ApproveModal: React.FC<ApproveModalProps> = ({ 
  isOpen, 
  onClose, 
  form, 
  onConfirm 
}) => (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title="ยืนยันการอนุมัติ"
    size="md"
  >
    <div className="p-4">
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        คุณต้องการอนุมัติแบบฟอร์มนี้หรือไม่?
      </p>
      
      {form && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-4">
          <p className="text-sm">
            <strong>วันที่:</strong> {formatTimestamp(form.date, 'dd/MM/yyyy')}
          </p>
          <p className="text-sm">
            <strong>กะ:</strong> {form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}
          </p>
          <p className="text-sm">
            <strong>หอผู้ป่วย:</strong> {form.wardName}
          </p>
          <p className="text-sm">
            <strong>ผู้บันทึก:</strong> {form.recorderFirstName} {form.recorderLastName}
          </p>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          ยกเลิก
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
        >
          อนุมัติ
        </Button>
      </div>
    </div>
  </Modal>
);

export const RejectModal: React.FC<RejectModalProps> = ({ 
  isOpen, 
  onClose, 
  form, 
  rejectReason, 
  setRejectReason, 
  onConfirm 
}) => (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title="ปฏิเสธแบบฟอร์ม"
    size="md"
  >
    <div className="p-4">
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        กรุณาระบุเหตุผลในการปฏิเสธแบบฟอร์มนี้:
      </p>
      
      {form && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-4">
          <p className="text-sm">
            <strong>วันที่:</strong> {formatTimestamp(form.date, 'dd/MM/yyyy')}
          </p>
          <p className="text-sm">
            <strong>กะ:</strong> {form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}
          </p>
          <p className="text-sm">
            <strong>หอผู้ป่วย:</strong> {form.wardName}
          </p>
          <p className="text-sm">
            <strong>ผู้บันทึก:</strong> {form.recorderFirstName} {form.recorderLastName}
          </p>
        </div>
      )}
      
      <textarea
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   resize-none"
        rows={4}
        placeholder="ระบุเหตุผลในการปฏิเสธ..."
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        required
      />
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          ยกเลิก
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={!rejectReason.trim()}
        >
          ปฏิเสธ
        </Button>
      </div>
    </div>
  </Modal>
); 