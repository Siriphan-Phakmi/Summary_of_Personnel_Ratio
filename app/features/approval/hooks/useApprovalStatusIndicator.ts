'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '@/app/features/auth/types/user';
import { WardForm, FormStatus } from '@/app/features/ward-form/types/ward';
import { getPendingForms } from '@/app/features/ward-form/services/approvalServices/approvalQueries';
import { Timestamp } from 'firebase/firestore';

// Helper function to safely convert Firestore Timestamp to JS Date
const convertToDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (dateValue instanceof Timestamp) return dateValue.toDate();
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

interface UseApprovalStatusIndicatorProps {
  user: User | null;
  enabled?: boolean;
}

interface ApprovalStatusIndicator {
  pendingCount: number;
  totalForms: number;
  hasNewSubmissions: boolean;
  lastUpdate: Date | null;
  loading: boolean;
  error: string | null;
}

interface UseApprovalStatusIndicatorReturn extends ApprovalStatusIndicator {
  refresh: () => Promise<void>;
  markAsViewed: () => void;
}

/**
 * Hook สำหรับแสดงสถานะการอนุมัติใน NavBar
 * - สำหรับ Nurse: แสดงสถานะของแบบฟอร์มที่ตนเองส่งไปรออนุมัติ
 * - สำหรับ Approver/Admin: แสดงจำนวนแบบฟอร์มที่รออนุมัติ
 */
export const useApprovalStatusIndicator = ({ 
  user, 
  enabled = true 
}: UseApprovalStatusIndicatorProps): UseApprovalStatusIndicatorReturn => {
  const [status, setStatus] = useState<ApprovalStatusIndicator>({
    pendingCount: 0,
    totalForms: 0,
    hasNewSubmissions: false,
    lastUpdate: null,
    loading: false,
    error: null,
  });

  const fetchApprovalStatus = useCallback(async () => {
    if (!user?.uid || !user?.role || !enabled) {
      return;
    }

    setStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      let forms: WardForm[] = [];
      
      if (user.role === UserRole.NURSE && user.assignedWardId) {
        // สำหรับ Nurse: ดูแบบฟอร์มของแผนกตนเองที่ส่งไปรออนุมัติ
        forms = await getPendingForms({ 
          wardId: user.assignedWardId,
          status: FormStatus.FINAL 
        });
      } else if (user.role === UserRole.APPROVER && user.approveWardIds?.length) {
        // สำหรับ Approver: ดูแบบฟอร์มที่รออนุมัติในแผนกที่ตนรับผิดชอบ
        forms = await getPendingForms({ 
          wardId: user.approveWardIds,
          status: FormStatus.FINAL 
        });
      } else if (user.role === UserRole.ADMIN || user.role === UserRole.DEVELOPER) {
        // สำหรับ Admin/Developer: ดูแบบฟอร์มทั้งหมดที่รออนุมัติ
        forms = await getPendingForms({ 
          status: FormStatus.FINAL 
        });
      }

      const pendingCount = forms.length;
      const totalForms = forms.length;
      
      // ตรวจสอบว่ามีการส่งใหม่หรือไม่ (ภายใน 1 ชั่วโมงที่ผ่านมา)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const hasNewSubmissions = forms.some(form => {
        // ✅ Enhanced Type Safety - ตรวจสอบว่ามี createdAt ก่อน
        if (!form.createdAt) return false;
        
        const createdAt = convertToDate(form.createdAt);
        return createdAt ? createdAt > oneHourAgo : false;
      });

      setStatus(prev => ({
        ...prev,
        pendingCount,
        totalForms,
        hasNewSubmissions,
        lastUpdate: new Date(),
        loading: false,
        error: null,
      }));

    } catch (error: any) {
      console.error('Error fetching approval status:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'เกิดข้อผิดพลาดในการโหลดสถานะการอนุมัติ',
      }));
    }
  }, [user, enabled]);

  const refresh = useCallback(async () => {
    await fetchApprovalStatus();
  }, [fetchApprovalStatus]);

  const markAsViewed = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      hasNewSubmissions: false,
    }));
  }, []);

  // Initial fetch และ auto-refresh ทุก 5 นาที
  useEffect(() => {
    fetchApprovalStatus();
    
    const interval = setInterval(fetchApprovalStatus, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchApprovalStatus]);

  return {
    ...status,
    refresh,
    markAsViewed,
  };
};