'use client';

import React, { useState, useEffect } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import Button from '@/app/core/ui/Button';
import { UserRole } from '@/app/core/types/user';
import { WardForm, FormStatus, ShiftType } from '@/app/core/types/ward';
import { getPendingForms, getApprovalHistoryByFormId } from '../forms/services/approvalServices/approvalQueries';
import { approveWardForm, rejectWardForm } from '../forms/services/approvalService';
import { formatTimestamp } from '@/app/core/utils/dateUtils';
import { showErrorToast, showSuccessToast } from '@/app/core/utils/toastUtils';
import Modal from '@/app/core/ui/Modal';
import { ApprovalHistoryRecord } from '@/app/core/types/approval';
import { FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface FormDetailsModalProps {
  form: WardForm | null;
  isOpen: boolean;
  onClose: () => void;
}

const FormDetailsModal: React.FC<FormDetailsModalProps> = ({ form, isOpen, onClose }) => {
  const [history, setHistory] = useState<ApprovalHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !form || !form.id) {
        setHistory([]);
        return;
      }
      
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const fetchedHistory = await getApprovalHistoryByFormId(form.id);
        setHistory(fetchedHistory);
      } catch (err) {
        console.error('Error fetching approval history:', err);
        setHistoryError('ไม่สามารถโหลดประวัติการดำเนินการได้');
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, form]);

  if (!form) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดแบบฟอร์ม" size="3xl">
      <div className="p-4 space-y-4">
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
                
        {form.comment && (
          <div className="mb-4 border-b pb-4 dark:border-gray-700">
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Comment:</h4>
            <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{form.comment}</p>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">ประวัติการดำเนินการ</h4>
          {historyLoading && (
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <FiLoader className="animate-spin h-5 w-5 mr-2" />
              กำลังโหลดประวัติ...
            </div>
          )}
          {historyError && (
            <p className="text-red-500 dark:text-red-400 text-sm">{historyError}</p>
          )}
          {!historyLoading && !historyError && history.length === 0 && (
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

const ApprovalStatusBadge: React.FC<{ status: FormStatus | string }> = ({ status }) => {
     const baseClasses = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium";
     if (status === FormStatus.APPROVED) {
       return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}>อนุมัติแล้ว</span>;
     } else if (status === FormStatus.REJECTED) {
       return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}>ปฏิเสธ</span>;
     } else if (status === FormStatus.DRAFT) {
       return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`}>ร่าง</span>;
     } else if (status === FormStatus.FINAL) {
       return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`}>รออนุมัติ</span>;
     }
     return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>{status}</span>;
};

export default function ApprovalPage() {
  const { user } = useAuth();
  const [searchDate, setSearchDate] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormStatus | ''>(FormStatus.FINAL);
  const [forms, setForms] = useState<WardForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedForm, setSelectedForm] = useState<WardForm | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      console.log("[ApprovalPage fetchData] START - State before filtering:", {
        userId: user.uid,
        userRole: user.role,
        userFloor: user.floor,
        searchDate,
        wardFilter,
        statusFilter
      });

      setLoading(true);
      setError(null);
      try {
        let fetchedForms: WardForm[] = [];
        const filters: { wardId?: string; startDate?: Date; endDate?: Date; status?: FormStatus; shift?: ShiftType } = {};

        if (searchDate) {
          filters.startDate = new Date(searchDate + 'T00:00:00');
          filters.endDate = new Date(searchDate + 'T23:59:59');
        }
        if (statusFilter) {
          filters.status = statusFilter;
        }

        if (user.role === UserRole.ADMIN || user.role === UserRole.APPROVER || user.role === UserRole.DEVELOPER) {
          if (wardFilter) {
            filters.wardId = wardFilter.toUpperCase();
          }
          console.log("[ApprovalPage] Fetching forms for ADMIN/APPROVER/DEV with filters:", JSON.stringify(filters));
          fetchedForms = await getPendingForms(filters);
          console.log("[ApprovalPage] Fetched forms result for ADMIN/APPROVER/DEV:", fetchedForms);
        } else {
          const userWardId = user.floor;
          console.log(`[ApprovalPage] User Role: ${user.role}, User Floor: ${userWardId}`);
          if (userWardId) {
            filters.wardId = userWardId.toUpperCase();
            console.log("[ApprovalPage] Fetching forms for NURSE/OTHER with filters (normalized):", JSON.stringify(filters));
            fetchedForms = await getPendingForms(filters);
            console.log("[ApprovalPage] Fetched forms result for NURSE/OTHER:", fetchedForms);
          } else {
            console.warn(`User ${user.username} (${user.role}) does not have an assigned ward (floor). Setting error.`);
            fetchedForms = [];
            setError('คุณไม่ได้ถูกกำหนดแผนก โปรดติดต่อผู้ดูแลระบบ');
          }
        }
        setForms(fetchedForms);
      } catch (err) {
         console.error("Error fetching approval forms:", err);
         const message = err instanceof Error ? err.message : "Failed to load data";
         setError(message);
         showErrorToast(`เกิดข้อผิดพลาด: ${message}`);
         setForms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, searchDate, wardFilter, statusFilter]);

  const handleViewDetails = (form: WardForm) => {
    setSelectedForm(form);
    setIsDetailsModalOpen(true);
  };
  
  const handleShowApproveModal = (form: WardForm) => {
    setSelectedForm(form);
    setIsApproveModalOpen(true);
  };
  
  const handleShowRejectModal = (form: WardForm) => {
    setSelectedForm(form);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };
  
  const handleApproveForm = async () => {
    if (!selectedForm || !user) return;
    
    setIsSubmitting(true);
    try {
      await approveWardForm(selectedForm.id!, user);
      showSuccessToast(`อนุมัติแบบฟอร์มของ ${selectedForm.wardName} วันที่ ${formatTimestamp(selectedForm.date, 'dd/MM/yyyy')} กะ${selectedForm.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'} เรียบร้อยแล้ว`);
      
      setForms(forms.filter(form => form.id !== selectedForm.id));
      setIsApproveModalOpen(false);
    } catch (error) {
      console.error('Error approving form:', error);
      showErrorToast(`เกิดข้อผิดพลาดในการอนุมัติแบบฟอร์ม: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRejectForm = async () => {
    if (!selectedForm || !user || !rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await rejectWardForm(selectedForm.id!, user, rejectionReason);
      showSuccessToast(`ปฏิเสธแบบฟอร์มของ ${selectedForm.wardName} วันที่ ${formatTimestamp(selectedForm.date, 'dd/MM/yyyy')} กะ${selectedForm.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'} เรียบร้อยแล้ว`);
      
      setForms(forms.filter(form => form.id !== selectedForm.id));
      setIsRejectModalOpen(false);
    } catch (error) {
      console.error('Error rejecting form:', error);
      showErrorToast(`เกิดข้อผิดพลาดในการปฏิเสธแบบฟอร์ม: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: FormStatus | string) => {
    if (status === FormStatus.APPROVED) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          อนุมัติแล้ว
        </span>
      );
    } else if (status === FormStatus.REJECTED) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          ปฏิเสธ
        </span>
      );
    } else if (status === FormStatus.DRAFT) {
       return (
         <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
           ร่าง
         </span>
       );
     }
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        {status === FormStatus.FINAL ? 'รออนุมัติ' : status}
      </span>
    );
  };

  const canApprove = user?.role === UserRole.ADMIN || user?.role === UserRole.APPROVER || user?.role === UserRole.DEVELOPER;

  return (
    <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.APPROVER, UserRole.NURSE, UserRole.HEAD_NURSE, UserRole.VIEWER, UserRole.DEVELOPER]}>
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <NavBar />
        <div className="container p-4 mx-auto">
          <h1 className="page-title text-light-text dark:text-dark-text">การอนุมัติแบบฟอร์ม</h1>

          <div className="bg-light-card dark:bg-dark-card shadow-md rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  วันที่
                </label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  หอผู้ป่วย
                </label>
                <select
                  value={wardFilter}
                  onChange={(e) => setWardFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  disabled={loading || !(user?.role === UserRole.ADMIN || user?.role === UserRole.APPROVER || user?.role === UserRole.DEVELOPER)}
                >
                  <option value="">ทั้งหมด</option>
                  <option value="WARD6">Ward 6</option>
                  <option value="ward2">หอผู้ป่วยใน 2</option>
                  <option value="icu">หอผู้ป่วยหนัก</option>
                </select>
                {!(user?.role === UserRole.ADMIN || user?.role === UserRole.APPROVER || user?.role === UserRole.DEVELOPER) && user?.floor && (
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">แสดงข้อมูลเฉพาะแผนก: {user.floor}</p>
                 )}
              </div>

              <div>
                <label className="block mb-2 text-base font-medium text-gray-900 dark:text-gray-200">
                  สถานะ
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FormStatus | '')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  disabled={loading}
                >
                  <option value="">ทั้งหมด</option>
                  <option value={FormStatus.FINAL}>รออนุมัติ (Final)</option>
                  <option value={FormStatus.APPROVED}>อนุมัติแล้ว (Approved)</option>
                  <option value={FormStatus.REJECTED}>ปฏิเสธ (Rejected)</option>
                  <option value={FormStatus.DRAFT}>ร่าง (Draft)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
            </div>
          </div>

          {loading && <p className="text-center text-gray-600 dark:text-gray-400 py-4">กำลังโหลดข้อมูล...</p>}
          {error && <p className="text-center text-red-600 dark:text-red-400 py-4">เกิดข้อผิดพลาด: {error}</p>}

          <div className="bg-light-card dark:bg-dark-card shadow-md rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">วันที่</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">กะ</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">หอผู้ป่วย</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">ผู้บันทึก</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">สถานะ</th>
                  <th className="px-4 py-3 text-left bg-gray-100 dark:bg-gray-700 text-base font-medium text-gray-900 dark:text-gray-200">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {!loading && forms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">ไม่พบข้อมูล</td>
                  </tr>
                )}
                {!loading && forms.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{formatTimestamp(item.date, 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.wardName}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">{item.recorderFirstName} {item.recorderLastName}</td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200">
                      {getStatusIcon(item.status)}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-200 space-x-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        disabled={loading}
                      >
                        ดูรายละเอียด
                      </Button>

                      {canApprove && item.status === FormStatus.FINAL && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleShowApproveModal(item)}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                            disabled={loading}
                          >
                            อนุมัติ
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleShowRejectModal(item)}
                            disabled={loading}
                          >
                            ปฏิเสธ
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <FormDetailsModal 
        form={selectedForm} 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)}
      />
      
      <Modal 
        isOpen={isApproveModalOpen} 
        onClose={() => setIsApproveModalOpen(false)}
        title="ยืนยันการอนุมัติ"
      >
        <div className="p-4">
          <p className="mb-4">คุณต้องการอนุมัติแบบฟอร์มนี้ใช่หรือไม่?</p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsApproveModalOpen(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={handleApproveForm}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
            </Button>
          </div>
        </div>
      </Modal>
      
      <Modal 
        isOpen={isRejectModalOpen} 
        onClose={() => setIsRejectModalOpen(false)}
        title="ปฏิเสธแบบฟอร์ม"
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900
              focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              dark:focus:border-blue-400 dark:focus:ring-blue-400"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="กรุณาระบุเหตุผลในการปฏิเสธ"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectForm}
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการปฏิเสธ'}
            </Button>
          </div>
        </div>
      </Modal>
    </ProtectedPage>
  );
}
