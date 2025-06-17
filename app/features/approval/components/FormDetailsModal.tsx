'use client';

import React, { useState, useEffect } from 'react';
import { FirestoreError } from 'firebase/firestore';
import Modal from '@/app/features/ward-form/components/ui/Modal';
import { WardForm, FormStatus, ShiftType } from '@/app/features/ward-form/types/ward';
import { ApprovalHistoryRecord } from '@/app/features/ward-form/types/approval';
import { getApprovalHistoryByFormId } from '@/app/features/ward-form/services/approvalServices/approvalQueries';
import { formatTimestamp } from '@/app/lib/utils/timestampUtils';
import { FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { handleIndexError } from '@/app/lib/firebase/indexDetector';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';

interface FormDetailsModalProps {
  form: WardForm | null;
  isOpen: boolean;
  onClose: () => void;
  modalConfig?: { [key: string]: string };
}

const FormDetailsModal: React.FC<FormDetailsModalProps> = ({ form, isOpen, onClose, modalConfig }) => {
  const [history, setHistory] = useState<ApprovalHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isIndexError, setIsIndexError] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !form || !form.id) {
        setHistory([]);
        return;
      }
      
      setHistoryLoading(true);
      setHistoryError(null);
      setIsIndexError(false);
      try {
        const fetchedHistory = await getApprovalHistoryByFormId(form.id);
        setHistory(fetchedHistory);
      } catch (err) {
        console.error('Error fetching approval history:', err);
        
        // ตรวจสอบว่าเป็น index error หรือไม่
        if (handleIndexError(err as FirestoreError, 'ApprovalPage.FormDetailsModal')) {
          setIsIndexError(true);
          setHistoryError(modalConfig?.historyIndexError || 'ไม่สามารถโหลดประวัติได้เนื่องจากขาด Firestore Index');
        } else {
          setHistoryError(modalConfig?.historyGenericError || 'ไม่สามารถโหลดประวัติการดำเนินการได้');
        }
        
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, form]);

  if (!form) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalConfig?.detailsTitle || "รายละเอียดแบบฟอร์ม"} size="xl">
      <div className="p-4 space-y-4">
        {/* Basic Form Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4 border-b pb-4 dark:border-gray-700">
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">{modalConfig?.dateLabel || 'วันที่:'}</h4>
            <p className="text-gray-900 dark:text-gray-100">{formatTimestamp(form.date, 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">{modalConfig?.shiftLabel || 'กะ:'}</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.shift === ShiftType.MORNING ? (modalConfig?.shiftMorning || 'เช้า') : (modalConfig?.shiftNight || 'ดึก')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">{modalConfig?.wardLabel || 'หอผู้ป่วย:'}</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.wardName}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">{modalConfig?.recorderLabel || 'ผู้บันทึก:'}</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.recorderFirstName} {form.recorderLastName}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">{modalConfig?.statusLabel || 'สถานะปัจจุบัน:'}</h4>
            <p className="text-gray-900 dark:text-gray-100">
              <ApprovalStatusBadge status={form.status} />
            </p>
          </div>
        </div>
        
        {/* Census and Staff Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4 border-b pb-4 dark:border-gray-700">
          <div>
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{modalConfig?.censusTitle || 'Patient Census:'}</h4>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{form.patientCensus || 0}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{modalConfig?.movementsTitle || 'Movements:'}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-gray-500">{modalConfig?.admittedLabel || 'Admitted:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.admitted || 0}</span></div>
              <div><span className="text-gray-500">{modalConfig?.transferredInLabel || 'Transferred In:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.transferredIn || 0}</span></div>
              <div><span className="text-gray-500">{modalConfig?.dischargedLabel || 'Discharged:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.discharged || 0}</span></div>
              <div><span className="text-gray-500">{modalConfig?.transferredOutLabel || 'Transferred Out:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.transferredOut || 0}</span></div>
              <div><span className="text-gray-500">{modalConfig?.deathsLabel || 'Deaths:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.deaths || 0}</span></div>
            </div>
            
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{modalConfig?.bedStatusTitle || 'Bed Status:'}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">{modalConfig?.availableBedsLabel || 'Available:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.availableBeds || 0}</span></div>
              <div><span className="text-gray-500">{modalConfig?.occupiedBedsLabel || 'Occupied:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.occupiedBeds || 0}</span></div>
              <div><span className="text-gray-500">{modalConfig?.totalBedsLabel || 'Total Beds:'}</span> <span className="text-gray-900 dark:text-gray-100">{form.totalBeds || 0}</span></div>
            </div>
          </div>
        </div>
                
        {/* Rejection Reason Section */}
        {form.rejectionReason && (
          <div className="mb-4 border-b pb-4 dark:border-gray-700">
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{modalConfig?.rejectionReasonLabel || 'เหตุผลในการปฏิเสธ:'}</h4>
            <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{form.rejectionReason}</p>
          </div>
        )}

        {/* Approval History */}
        <div className="mb-4">
          <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">{modalConfig?.historyTitle || 'ประวัติการดำเนินการ'}</h4>
          {historyLoading && (
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <FiLoader className="animate-spin h-5 w-5 mr-2" />
              {modalConfig?.historyLoading || 'กำลังโหลดประวัติ...'}
            </div>
          )}
          
          {isIndexError && (
            <div className="flex items-start space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-md">
              <FiAlertTriangle className="mt-1 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">{modalConfig?.historyIndexErrorTitle || 'พบปัญหา Firestore Index'}</p>
                <p className="text-sm">{modalConfig?.historyIndexErrorMessage || 'ไม่สามารถโหลดประวัติได้เนื่องจากขาด Index ที่จำเป็น กรุณาแจ้งผู้ดูแลระบบ'}</p>
              </div>
            </div>
          )}
          
          {historyError && !isIndexError && (
            <p className="text-red-500 dark:text-red-400 text-sm">{historyError}</p>
          )}
          
          {!historyLoading && !historyError && !isIndexError && history.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">{modalConfig?.historyEmpty || 'ยังไม่มีประวัติการดำเนินการ'}</p>
          )}
          
          {!historyLoading && !historyError && history.length > 0 && (
            <ul className="space-y-3">
              {history.map((record) => (
                <li key={record.id} className="flex items-start space-x-3 text-sm">
                  <div className={`mt-1 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${record.action === 'APPROVED' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    {record.action === 'APPROVED' ? (
                      <FiCheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <FiXCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{record.actorName || 'N/A'}</span>
                      {record.action === 'APPROVED' ? (modalConfig?.historyActionApproved || ' อนุมัติ') : (modalConfig?.historyActionRejected || ' ปฏิเสธ')}
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({formatTimestamp(record.timestamp, 'dd/MM/yyyy HH:mm')})
                      </span>
                    </p>
                    {record.action === 'REJECTED' && record.reason && (
                      <p className="mt-1 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs italic">{modalConfig?.historyReasonPrefix || 'เหตุผล:'} {record.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

export { FormDetailsModal }; 