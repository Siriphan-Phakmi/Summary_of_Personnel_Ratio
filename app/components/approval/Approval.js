'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftForm from '../forms/ShiftForm';
import { useAuth } from '../../context/AuthContext';
import { logEvent } from '../../utils/clientLogging';

/**
 * Component สำหรับหน้าอนุมัติข้อมูล
 * ใช้ ShiftForm ในโหมดอนุมัติเพื่อแสดงข้อมูลและปุ่มอนุมัติ
 */
export default function Approval() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const isApprover = user?.role?.toLowerCase() === 'approver' || user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    // Log event เมื่อเข้าถึงหน้าอนุมัติ
    logEvent('approval_page_accessed', {
      userId: user?.uid || 'unknown',
      userRole: user?.role || 'unknown'
    });
    
    setLoading(false);
  }, [user]);

  return (
    <div>
      <div className="bg-yellow-50 p-4 mb-6 rounded-lg border border-yellow-200">
        <h2 className="font-medium text-yellow-700 mb-2">
          {isApprover ? 'หน้าสำหรับการอนุมัติข้อมูล' : 'หน้าแสดงสถานะการอนุมัติข้อมูล'}
        </h2>
        <p className="text-sm text-yellow-600">
          {isApprover 
            ? 'คุณสามารถตรวจสอบและอนุมัติข้อมูลได้ในหน้านี้ ข้อมูลที่อนุมัติแล้วจะไม่สามารถแก้ไขได้อีก'
            : 'คุณสามารถดูสถานะการอนุมัติข้อมูลของแผนกคุณได้ในหน้านี้ แต่ไม่สามารถอนุมัติข้อมูลได้'
          }
        </p>
      </div>
      
      {/* นำ ShiftForm มาใช้ในโหมดอนุมัติ */}
      <ShiftForm isApprovalMode={true} />
    </div>
  );
} 