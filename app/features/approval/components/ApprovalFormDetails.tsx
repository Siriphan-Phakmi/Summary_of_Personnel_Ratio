'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/app/core/ui/Modal';
import { WardForm, FormStatus, ShiftType } from '@/app/core/types/ward';
import { ApprovalHistoryRecord } from '@/app/core/types/approval';
import { getApprovalHistoryByFormId } from '@/app/features/ward-form/services/approvalServices/approvalQueries';
import { formatTimestamp } from '@/app/core/utils/dateUtils';
import { FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { handleIndexError } from '@/app/core/firebase/indexDetector';

interface FormDetailsModalProps {
  form: WardForm | null;
  isOpen: boolean;
  onClose: () => void;
}

const ApprovalStatusBadge: React.FC<{ status: FormStatus | string }> = ({ status }) => {
  const getStatusInfo = (status: FormStatus | string) => {
    switch (status) {
      case FormStatus.DRAFT:
        return { 
          text: 'ร่าง', 
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' 
        };
      case FormStatus.FINAL:
        return { 
          text: 'รอการตรวจสอบ', 
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' 
        };
      case FormStatus.APPROVED:
        return { 
          text: 'อนุมัติแล้ว', 
          className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' 
        };
      case FormStatus.REJECTED:
        return { 
          text: 'ปฏิเสธ', 
          className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' 
        };
      default:
        return { 
          text: status || 'ไม่ทราบสถานะ', 
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' 
        };
    }
  };

  const { text, className } = getStatusInfo(status);
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${className}`}>
      {text}
    </span>
  );
};

const FormDetailsModal: React.FC<FormDetailsModalProps> = ({ form, isOpen, onClose }) => {
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
        if (handleIndexError(err, 'ApprovalPage.FormDetailsModal')) {
          setIsIndexError(true);
          setHistoryError('ไม่สามารถโหลดประวัติได้เนื่องจากขาด Firestore Index');
        } else {
          setHistoryError('ไม่สามารถโหลดประวัติการดำเนินการได้');
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
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดแบบฟอร์ม" size="xl">
      <div className="p-4 space-y-4">
        {/* Basic Form Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4 border-b pb-4 dark:border-gray-700">
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">วันที่:</h4>
            <p className="text-gray-900 dark:text-gray-100">{formatTimestamp(form.date, 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">กะ:</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">หอผู้ป่วย:</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.wardName}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">ผู้บันทึก:</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.recorderFirstName} {form.recorderLastName}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">สถานะปัจจุบัน:</h4>
            <p className="text-gray-900 dark:text-gray-100">
              <ApprovalStatusBadge status={form.status} />
            </p>
          </div>
        </div>
        
        {/* Census and Staff Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4 border-b pb-4 dark:border-gray-700">
          <div>
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Patient Census:</h4>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{form.patientCensus || 0}</p>
            
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Nursing Staff:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Manager:</span> <span className="text-gray-900 dark:text-gray-100">{form.nurseManager || 0}</span></div>
              <div><span className="text-gray-500">RN:</span> <span className="text-gray-900 dark:text-gray-100">{form.rn || 0}</span></div>
              <div><span className="text-gray-500">PN:</span> <span className="text-gray-900 dark:text-gray-100">{form.pn || 0}</span></div>
              <div><span className="text-gray-500">WC:</span> <span className="text-gray-900 dark:text-gray-100">{form.wc || 0}</span></div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Movements:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-gray-500">New Admit:</span> <span className="text-gray-900 dark:text-gray-100">{form.newAdmit || 0}</span></div>
              <div><span className="text-gray-500">Transfer In:</span> <span className="text-gray-900 dark:text-gray-100">{form.transferIn || 0}</span></div>
              <div><span className="text-gray-500">Refer In:</span> <span className="text-gray-900 dark:text-gray-100">{form.referIn || 0}</span></div>
              <div><span className="text-gray-500">Discharge:</span> <span className="text-gray-900 dark:text-gray-100">{form.discharge || 0}</span></div>
              <div><span className="text-gray-500">Transfer Out:</span> <span className="text-gray-900 dark:text-gray-100">{form.transferOut || 0}</span></div>
              <div><span className="text-gray-500">Refer Out:</span> <span className="text-gray-900 dark:text-gray-100">{form.referOut || 0}</span></div>
              <div><span className="text-gray-500">Dead:</span> <span className="text-gray-900 dark:text-gray-100">{form.dead || 0}</span></div>
            </div>
            
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Bed Status:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Available:</span> <span className="text-gray-900 dark:text-gray-100">{form.available || 0}</span></div>
              <div><span className="text-gray-500">Unavailable:</span> <span className="text-gray-900 dark:text-gray-100">{form.unavailable || 0}</span></div>
              <div><span className="text-gray-500">Planned Disc:</span> <span className="text-gray-900 dark:text-gray-100">{form.plannedDischarge || 0}</span></div>
            </div>
          </div>
        </div>
                
        {/* Comment Section */}
        {form.comment && (
          <div className="mb-4 border-b pb-4 dark:border-gray-700">
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Comment:</h4>
            <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{form.comment}</p>
          </div>
        )}

        {/* Approval History */}
        <div className="mb-4">
          <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">ประวัติการดำเนินการ</h4>
          {historyLoading && (
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <FiLoader className="animate-spin h-5 w-5 mr-2" />
              กำลังโหลดประวัติ...
            </div>
          )}
          
          {isIndexError && (
            <div className="flex items-start space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-md">
              <FiAlertTriangle className="mt-1 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">พบปัญหา Firestore Index</p>
                <p className="text-sm">ไม่สามารถโหลดประวัติได้เนื่องจากขาด Index ที่จำเป็น กรุณาแจ้งผู้ดูแลระบบ</p>
              </div>
            </div>
          )}
          
          {historyError && !isIndexError && (
            <p className="text-red-500 dark:text-red-400 text-sm">{historyError}</p>
          )}
          
          {!historyLoading && !historyError && !isIndexError && history.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">ยังไม่มีประวัติการดำเนินการ</p>
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
                      {record.action === 'APPROVED' ? ' อนุมัติ' : ' ปฏิเสธ'}
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({formatTimestamp(record.timestamp, 'dd/MM/yyyy HH:mm')})
                      </span>
                    </p>
                    {record.action === 'REJECTED' && record.reason && (
                      <p className="mt-1 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs italic">เหตุผล: {record.reason}</p>
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

export { FormDetailsModal, ApprovalStatusBadge }; 