'use client';

import React from 'react';
import { WardForm, ShiftType } from '@/app/features/ward-form/types/ward';
import { formatTimestamp } from '@/app/lib/utils/timestampUtils';
import Modal from '@/app/features/ward-form/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WardForm | null;
  onConfirm: () => Promise<void>;
  modalConfig?: { [key: string]: string };
}

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WardForm | null;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  onConfirm: () => Promise<void>;
  modalConfig?: { [key: string]: string };
}

export const ApproveModal: React.FC<ApproveModalProps> = ({ 
  isOpen, 
  onClose, 
  form, 
  onConfirm,
  modalConfig
}) => (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title={modalConfig?.confirmApprovalTitle || "ยืนยันการอนุมัติ"}
    size="md"
  >
    <div className="p-4">
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        {modalConfig?.confirmApprovalMessage || 'คุณต้องการอนุมัติแบบฟอร์มนี้หรือไม่?'}
      </p>
      
      {form && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-4">
          <p className="text-sm">
            <strong>{modalConfig?.dateLabel || 'วันที่:'}</strong> {formatTimestamp(form.date, 'dd/MM/yyyy')}
          </p>
          <p className="text-sm">
            <strong>{modalConfig?.shiftLabel || 'กะ:'}</strong> {form.shift === ShiftType.MORNING ? (modalConfig?.shiftMorning || 'เช้า') : (modalConfig?.shiftNight || 'ดึก')}
          </p>
          <p className="text-sm">
            <strong>{modalConfig?.wardLabel || 'หอผู้ป่วย:'}</strong> {form.wardName}
          </p>
          <p className="text-sm">
            <strong>{modalConfig?.recorderLabel || 'ผู้บันทึก:'}</strong> {form.recorderFirstName} {form.recorderLastName}
          </p>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          {modalConfig?.cancelButton || 'ยกเลิก'}
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
        >
          {modalConfig?.approveButton || 'อนุมัติ'}
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
  onConfirm,
  modalConfig
}) => (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title={modalConfig?.rejectTitle || "ปฏิเสธแบบฟอร์ม"}
    size="md"
  >
    <div className="p-4">
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        {modalConfig?.rejectMessage || 'กรุณาระบุเหตุผลในการปฏิเสธแบบฟอร์มนี้:'}
      </p>
      
      {form && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-4">
          <p className="text-sm">
            <strong>{modalConfig?.dateLabel || 'วันที่:'}</strong> {formatTimestamp(form.date, 'dd/MM/yyyy')}
          </p>
          <p className="text-sm">
            <strong>{modalConfig?.shiftLabel || 'กะ:'}</strong> {form.shift === ShiftType.MORNING ? (modalConfig?.shiftMorning || 'เช้า') : (modalConfig?.shiftNight || 'ดึก')}
          </p>
          <p className="text-sm">
            <strong>{modalConfig?.wardLabel || 'หอผู้ป่วย:'}</strong> {form.wardName}
          </p>
          <p className="text-sm">
            <strong>{modalConfig?.recorderLabel || 'ผู้บันทึก:'}</strong> {form.recorderFirstName} {form.recorderLastName}
          </p>
        </div>
      )}
      
      <textarea
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   resize-none"
        rows={4}
        placeholder={modalConfig?.rejectionPlaceholder || "ระบุเหตุผลในการปฏิเสธ..."}
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        required
      />
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          {modalConfig?.cancelButton || 'ยกเลิก'}
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={!rejectReason.trim()}
        >
          {modalConfig?.rejectButton || 'ปฏิเสธ'}
        </Button>
      </div>
    </div>
  </Modal>
); 