'use client';

import { useState, useEffect, useCallback } from 'react';
import { WardForm, FormStatus } from '@/app/core/types/ward';
import { User, UserRole } from '@/app/core/types/user';
import { getPendingForms } from '@/app/features/ward-form/services/approvalServices/approvalQueries';
import { approveWardForm, rejectWardForm } from '@/app/features/ward-form/services/approvalService';
import { showErrorToast, showSuccessToast } from '@/app/core/utils/toastUtils';
import { handleIndexError } from '@/app/core/firebase/indexDetector';
import { safeQuery } from '@/app/core/firebase/firestoreUtils';

interface UseApprovalDataProps {
  user: User | null;
}

interface UseApprovalDataReturn {
  forms: WardForm[];
  loading: boolean;
  error: string | null;
  isIndexError: boolean;
  selectedFormForDetails: WardForm | null;
  selectedFormForApprove: WardForm | null;
  selectedFormForReject: WardForm | null;
  showDetailsModal: boolean;
  showApproveModal: boolean;
  showRejectModal: boolean;
  rejectReason: string;
  fetchForms: () => Promise<void>;
  openDetailsModal: (form: WardForm) => void;
  closeDetailsModal: () => void;
  openApproveModal: (form: WardForm) => void;
  closeApproveModal: () => void;
  openRejectModal: (form: WardForm) => void;
  closeRejectModal: () => void;
  setRejectReason: (reason: string) => void;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
}

export const useApprovalData = ({ user }: UseApprovalDataProps): UseApprovalDataReturn => {
  const [forms, setForms] = useState<WardForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexError, setIsIndexError] = useState(false);

  // Modal states
  const [selectedFormForDetails, setSelectedFormForDetails] = useState<WardForm | null>(null);
  const [selectedFormForApprove, setSelectedFormForApprove] = useState<WardForm | null>(null);
  const [selectedFormForReject, setSelectedFormForReject] = useState<WardForm | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchForms = useCallback(async () => {
    if (!user?.uid || !user?.role) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsIndexError(false);

    try {
      let fetchedForms: WardForm[] = [];

      // ใช้ offline-safe query แทน direct Firebase call
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DEVELOPER) {
        // Admin/Super Admin/Developer เห็นฟอร์มทุกแผนก
        const allForms = await safeQuery<WardForm>(
          'wardForms',
          [
            // เงื่อนไขสำหรับฟอร์มที่รอการอนุมัติ
          ],
          'ApprovalPage-Admin'
        );
        fetchedForms = allForms?.filter(form => form.status === FormStatus.FINAL) || [];
      } else if (user.role === UserRole.APPROVER) {
        // Approver เห็นเฉพาะฟอร์มในแผนกที่ตนเองมีสิทธิ์
        fetchedForms = await getPendingForms({ createdBy: user.uid, status: FormStatus.FINAL });
      }

      setForms(fetchedForms);
    } catch (err) {
      console.error('Error fetching forms:', err);
      
      if (handleIndexError(err, 'ApprovalPage')) {
        setIsIndexError(true);
        setError('ไม่สามารถโหลดข้อมูลได้เนื่องจากขาด Firestore Index');
      } else {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Modal handlers
  const openDetailsModal = (form: WardForm) => {
    setSelectedFormForDetails(form);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedFormForDetails(null);
  };

  const openApproveModal = (form: WardForm) => {
    setSelectedFormForApprove(form);
    setShowApproveModal(true);
  };

  const closeApproveModal = () => {
    setShowApproveModal(false);
    setSelectedFormForApprove(null);
  };

  const openRejectModal = (form: WardForm) => {
    setSelectedFormForReject(form);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedFormForReject(null);
    setRejectReason('');
  };

  const handleApprove = async () => {
    if (!selectedFormForApprove?.id || !user) return;

    try {
      await approveWardForm(selectedFormForApprove.id, user);
      showSuccessToast('อนุมัติแบบฟอร์มเรียบร้อยแล้ว');
      closeApproveModal();
      fetchForms(); // รีเฟรชข้อมูล
    } catch (error) {
      console.error('Error approving form:', error);
      showErrorToast('เกิดข้อผิดพลาดในการอนุมัติแบบฟอร์ม');
    }
  };

  const handleReject = async () => {
    if (!selectedFormForReject?.id || !user || !rejectReason.trim()) {
      showErrorToast('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    try {
      await rejectWardForm(selectedFormForReject.id, user, rejectReason.trim());
      showSuccessToast('ปฏิเสธแบบฟอร์มเรียบร้อยแล้ว');
      closeRejectModal();
      fetchForms(); // รีเฟรชข้อมูล
    } catch (error) {
      console.error('Error rejecting form:', error);
      showErrorToast('เกิดข้อผิดพลาดในการปฏิเสธแบบฟอร์ม');
    }
  };

  return {
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
  };
}; 