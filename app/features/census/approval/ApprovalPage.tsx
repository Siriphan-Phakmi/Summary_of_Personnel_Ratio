'use client';

import React, { useState, useEffect } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import Button from '@/app/core/ui/Button';
import { UserRole } from '@/app/core/types/user';
import { WardForm, FormStatus, ShiftType } from '@/app/core/types/ward';
import { getPendingForms } from '../forms/services/approvalServices/approvalQueries';
import { formatTimestamp } from '@/app/core/utils/dateUtils';
import { showErrorToast } from '@/app/core/utils/toastUtils';

export default function ApprovalPage() {
  const { user } = useAuth();
  const [searchDate, setSearchDate] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormStatus | ''>(FormStatus.FINAL);
  const [forms, setForms] = useState<WardForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data based on user role and filters
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
                        onClick={() => console.log('View Details for:', item.id)}
                        disabled={loading}
                      >
                        ดูรายละเอียด
                      </Button>

                      {canApprove && item.status === FormStatus.FINAL && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => console.log('Approve:', item.id)}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                            disabled={loading}
                          >
                            อนุมัติ
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => console.log('Reject:', item.id)}
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
    </ProtectedPage>
  );
}
