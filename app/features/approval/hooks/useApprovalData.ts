'use client';

import { useState, useEffect, useCallback } from 'react';
import { WardForm, FormStatus } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getPendingForms } from '@/app/features/ward-form/services/approvalServices/approvalQueries';
import { approveWardForm, rejectWardForm } from '@/app/features/ward-form/services/approvalService';
import { showErrorToast, showSuccessToast } from '@/app/lib/utils/toastUtils';
// import { handleIndexError } from '@/app/core/firebase/indexDetector'; // File not found, will address later
import { safeQuery } from '@/lib/firebase/firestoreUtils';
import { where, collection, query, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';

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
      const userRole = user.role;

      // Admin and Developer see all pending forms from all wards.
      if (userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER) {
        fetchedForms = await getPendingForms({ status: FormStatus.FINAL });

      // Approvers see pending forms from the specific wards they are assigned to approve.
      } else if (userRole === UserRole.APPROVER && user.approveWardIds && user.approveWardIds.length > 0) {
        fetchedForms = await getPendingForms({ wardId: user.approveWardIds, status: FormStatus.FINAL });
      
      // Other users (Nurses, Ward Clerks, etc.) see all forms (including drafts, pending, approved) from their single assigned ward.
      } else if (user.assignedWardId) {
         fetchedForms = await getPendingForms({ wardId: user.assignedWardId });
      } else {
        // Fallback for users with no assigned ward or if something is misconfigured.
        console.warn(`User ${user.username} with role ${user.role} has no assigned ward(s).`);
        fetchedForms = [];
      }

      setForms(fetchedForms);
    } catch (err: any) {
      console.error('Error fetching forms:', err);
      
      // if (handleIndexError(err, 'ApprovalPage')) {
      //   setIsIndexError(true);
      //   setError('ไม่สามารถโหลดข้อมูลได้เนื่องจากขาด Firestore Index');
      // } else {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      // }
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