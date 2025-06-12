'use client';

import React, { useMemo } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import Button from '@/app/core/ui/Button';
import { UserRole } from '@/app/core/types/user';
import { WardForm, FormStatus, ShiftType } from '@/app/core/types/ward';
import { formatTimestamp } from '@/app/core/utils/dateUtils';
import { FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';

// Import separated components and hooks
import { FormDetailsModal, ApprovalStatusBadge } from './components/FormDetailsModal';
import { ApproveModal, RejectModal } from './components/ApprovalModals';
import { useApprovalData } from './hooks/useApprovalData';

interface IndexErrorMessageProps {
  error?: unknown;
}

const extractIndexUrl = (error: unknown): string | null => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String(error.message);
    const urlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    return urlMatch ? urlMatch[0] : null;
  }
  return null;
};

const IndexErrorMessage: React.FC<IndexErrorMessageProps> = ({ error }) => {
  const indexUrl = extractIndexUrl(error);
  
  return (
    <div className="flex items-start space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md">
      <FiAlertTriangle className="mt-1 h-6 w-6 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-semibold mb-2">ต้องสร้าง Firestore Index</h3>
        <p className="text-sm mb-3">
          การ query นี้ต้องการ composite index ที่ยังไม่ได้สร้างใน Firestore 
          คลิกลิงก์ด้านล่างเพื่อสร้าง index อัตโนมัติ
        </p>
        {indexUrl && (
          <a 
            href={indexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <FiExternalLink className="mr-1 h-4 w-4" />
            สร้าง Index ใน Firebase Console
          </a>
        )}
        <p className="text-xs mt-2 text-amber-500 dark:text-amber-300">
          หลังจากสร้าง index แล้ว รอสักครู่แล้วรีเฟรชหน้านี้
        </p>
      </div>
    </div>
  );
};

const getComparisonTimestamp = (time: any): number => {
  if (!time) return 0;
  
  // ถ้าเป็น Firebase Timestamp
  if (time && typeof time === 'object' && 'seconds' in time) {
    return time.seconds;
  }
  
  // ถ้าเป็น Date object
  if (time instanceof Date) {
    return Math.floor(time.getTime() / 1000);
  }
  
  // ถ้าเป็นตัวเลข (timestamp)
  if (typeof time === 'number') {
    return time > 1e10 ? Math.floor(time / 1000) : time;
  }
  
  return 0;
};

export default function ApprovalPage() {
  const { user: currentUser } = useAuth();

  // ใช้ custom hook ที่แยกออกมา
  const {
    forms,
    loading,
    error,
    isIndexError,
    selectedFormForDetails,
    selectedFormForApprove,
    selectedFormForReject,
    showDetailsModal,
    showApproveModal,
    showRejectModal,
    rejectReason,
    fetchForms,
    openDetailsModal,
    closeDetailsModal,
    openApproveModal,
    closeApproveModal,
    openRejectModal,
    closeRejectModal,
    setRejectReason,
    handleApprove,
    handleReject,
  } = useApprovalData({ user: currentUser });

  // เรียงลำดับฟอร์ม
  const sortedForms = useMemo(() => {
    return [...forms].sort((a, b) => {
      const aTime = getComparisonTimestamp(a.updatedAt || a.createdAt);
      const bTime = getComparisonTimestamp(b.updatedAt || b.createdAt);
      return bTime - aTime;
    });
  }, [forms]);

  return (
    <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DEVELOPER, UserRole.APPROVER]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  อนุมัติแบบฟอร์ม
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  จัดการและอนุมัติแบบฟอร์มที่รอการตรวจสอบ
                </p>
              </div>
              <Button
                onClick={fetchForms}
                variant="secondary"
                disabled={loading}
              >
                {loading ? <FiLoader className="animate-spin h-4 w-4 mr-2" /> : null}
                รีเฟรช
              </Button>
            </div>
          </div>

          {/* Error States */}
          {isIndexError && <IndexErrorMessage error={error} />}
          
          {/* Content */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                {loading && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center">
                      <FiLoader className="animate-spin h-5 w-5 mr-2 text-blue-500" />
                      <span>กำลังโหลดข้อมูล...</span>
                    </div>
                  </div>
                )}
                
                {!loading && error && !isIndexError && (
                  <div className="text-center py-8 text-red-500">
                    <p>{error}</p>
                  </div>
                )}
                
                {!loading && !error && forms.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>ไม่พบแบบฟอร์มที่ตรงตามเงื่อนไข</p>
                  </div>
                )}
                
                {!loading && !error && sortedForms.length > 0 && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          วันที่/กะ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          หอผู้ป่วย
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          ผู้บันทึก
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          สถานะ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          อัปเดตล่าสุด
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          การดำเนินการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sortedForms.map((form) => (
                        <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div>
                              <div className="font-medium">
                                {formatTimestamp(form.date, 'dd/MM/yyyy')}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                กะ{form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {form.wardName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {form.recorderFirstName} {form.recorderLastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ApprovalStatusBadge status={form.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatTimestamp(form.updatedAt || form.createdAt, 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openDetailsModal(form)}
                              >
                                ดูรายละเอียด
                              </Button>
                              {form.status === FormStatus.FINAL && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => openApproveModal(form)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <FiCheckCircle className="h-4 w-4 mr-1" />
                                    อนุมัติ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => openRejectModal(form)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    <FiXCircle className="h-4 w-4 mr-1" />
                                    ปฏิเสธ
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <FormDetailsModal
          form={selectedFormForDetails}
          isOpen={showDetailsModal}
          onClose={closeDetailsModal}
        />

        <ApproveModal
          form={selectedFormForApprove}
          isOpen={showApproveModal}
          onClose={closeApproveModal}
          onConfirm={handleApprove}
        />

        <RejectModal
          form={selectedFormForReject}
          isOpen={showRejectModal}
          onClose={closeRejectModal}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onConfirm={handleReject}
        />
      </div>
    </ProtectedPage>
  );
}
