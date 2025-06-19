'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/app/features/auth';
import { UserRole } from '@/app/features/auth/types/user';
import { WardForm, FormStatus, ShiftType } from '@/app/features/ward-form/types/ward';
import { formatTimestamp } from '@/app/lib/utils/timestampUtils';
import { FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Button } from '@/app/components/ui/Button';

// Import separated components and hooks from feature index
import { 
  FormDetailsModal, 
  ApprovalStatusBadge, 
  IndexErrorMessage,
  ApproveModal, 
  RejectModal 
} from './components';
import { useApprovalData } from './hooks/useApprovalData';
import { getComparisonTimestamp } from './utils/approvalUtils';
import { useFormConfig } from '@/app/features/config/hooks/useFormConfig';

export default function ApprovalPage() {
  const { user: currentUser } = useAuth();

  // Define roles that have approval permissions
  const canApproveRoles = [
    UserRole.ADMIN,
    UserRole.APPROVER,
  ];

  // Check if the current user has approval permission
  const canApprove = currentUser ? canApproveRoles.includes(currentUser.role) : false;

  // Fetch form configuration from Firestore
  const { formConfig, loading: isConfigLoading, error: configError } = useFormConfig('approval_form');

  // Use the custom hook
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

  // Combine loading states
  const isPageLoading = loading || isConfigLoading;

  // Sort forms
  const sortedForms = useMemo(() => {
    return [...forms].sort((a, b) => {
      const aTime = getComparisonTimestamp(a.updatedAt || a.createdAt);
      const bTime = getComparisonTimestamp(b.updatedAt || b.createdAt);
      return bTime - aTime;
    });
  }, [forms]);

  const labels = formConfig?.labels;
  const helpers = formConfig?.helpers;
  const tableHeaders = formConfig?.tableHeaders;

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {labels?.pageTitle || 'อนุมัติแบบฟอร์ม'}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {labels?.pageDescription || 'จัดการและอนุมัติแบบฟอร์มที่รอการตรวจสอบ'}
                </p>
              </div>
              <Button
                onClick={fetchForms}
                variant="secondary"
                disabled={isPageLoading}
              >
                {isPageLoading ? <FiLoader className="animate-spin h-4 w-4 mr-2" /> : null}
                {labels?.refreshButton || 'รีเฟรช'}
              </Button>
            </div>
          </div>

          {/* Error States */}
          {isIndexError && <IndexErrorMessage error={error} />}
          {configError && !isIndexError && (
             <div className="text-center py-8 text-red-500">
                <p>Could not load UI configuration: {configError}</p>
             </div>
          )}
          
          {/* Content */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                {isPageLoading && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center">
                      <FiLoader className="animate-spin h-5 w-5 mr-2 text-blue-500" />
                      <span>{helpers?.loadingData || 'กำลังโหลดข้อมูล...'}</span>
                    </div>
                  </div>
                )}
                
                {!isPageLoading && error && !isIndexError && (
                  <div className="text-center py-8 text-red-500">
                    <p>{error}</p>
                  </div>
                )}
                
                {!isPageLoading && !error && forms.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>{helpers?.noItemsFound || 'ไม่พบแบบฟอร์มที่ตรงตามเงื่อนไข'}</p>
                  </div>
                )}
                
                {!isPageLoading && !error && sortedForms.length > 0 && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tableHeaders?.dateShift || 'วันที่/กะ'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tableHeaders?.ward || 'หอผู้ป่วย'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tableHeaders?.recordedBy || 'ผู้บันทึก'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tableHeaders?.status || 'สถานะ'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tableHeaders?.lastUpdated || 'อัปเดตล่าสุด'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tableHeaders?.actions || 'การดำเนินการ'}
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
                                {labels?.shiftPrefix || 'กะ'}
                                {form.shift === ShiftType.MORNING ? (labels?.shiftMorning || 'เช้า') : (labels?.shiftNight || 'ดึก')}
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
                            <ApprovalStatusBadge status={form.status} config={formConfig?.statusBadges} />
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
                                {labels?.viewDetailsButton || 'ดูรายละเอียด'}
                              </Button>
                              {/* Show buttons only if user has permission AND form is ready for action */}
                              {canApprove && form.status === FormStatus.FINAL && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => openApproveModal(form)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <FiCheckCircle className="h-4 w-4 mr-1" />
                                    {labels?.approveButton || 'อนุมัติ'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openRejectModal(form)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    <FiXCircle className="h-4 w-4 mr-1" />
                                    {labels?.rejectButton || 'ปฏิเสธ'}
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
          modalConfig={formConfig?.modal}
        />

        <ApproveModal
          form={selectedFormForApprove}
          isOpen={showApproveModal}
          onClose={closeApproveModal}
          onConfirm={handleApprove}
          modalConfig={formConfig?.modal}
        />

        <RejectModal
          form={selectedFormForReject}
          isOpen={showRejectModal}
          onClose={closeRejectModal}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onConfirm={handleReject}
          modalConfig={formConfig?.modal}
        />
      </div>
  );
}
