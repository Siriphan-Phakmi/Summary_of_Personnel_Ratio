'use client';
import React from 'react';
import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SwalAlert } from '../../../utils/alertService';
import { logEvent } from '../../../utils/clientLogging';
import { useAuth } from '../../../context/AuthContext';

const ApproveButton = ({ wardId, date, status = 'pending' }) => {
  const [isApproving, setIsApproving] = useState(false);
  const { user } = useAuth();
  
  // ตรวจสอบว่าผู้ใช้เป็น supervisor หรือ admin หรือไม่
  const canApprove = user?.role === 'supervisor' || user?.role === 'admin';
  
  // ถ้าไม่ใช่ supervisor และสถานะยังไม่ได้อนุมัติหรือปฏิเสธ ให้แสดงแค่ป้ายสถานะ
  if (!canApprove && status === 'pending') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <svg className="h-4 w-4 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        รออนุมัติ
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      
      // รับชื่อผู้อนุมัติก่อนการอนุมัติ
      const signatureResult = await SwalAlert.fire({
        title: 'ลงชื่อผู้อนุมัติ',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">กรุณากรอกชื่อผู้อนุมัติ</p>
            <div class="mb-3">
              <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              <input type="text" id="firstName" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ชื่อ" value="${user?.firstName || ''}">
            </div>
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
              <input type="text" id="lastName" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="นามสกุล" value="${user?.lastName || ''}">
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0ab4ab',
        cancelButtonColor: '#d33',
        preConfirm: () => {
          const firstName = document.getElementById('firstName').value;
          const lastName = document.getElementById('lastName').value;
          
          if (!firstName.trim()) {
            SwalAlert.showValidationMessage('กรุณากรอกชื่อ');
            return false;
          }
          
          if (!lastName.trim()) {
            SwalAlert.showValidationMessage('กรุณากรอกนามสกุล');
            return false;
          }
          
          return { firstName, lastName };
        }
      });

      if (!signatureResult.isConfirmed) {
        setIsApproving(false);
        return;
      }

      const { firstName, lastName } = signatureResult.value;
      
      // Confirm before approving
      const confirmResult = await SwalAlert.fire({
        title: 'อนุมัติข้อมูล Ward',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">คุณต้องการอนุมัติข้อมูลของ ${wardId} ใช่หรือไม่?</p>
            <p class="text-sm text-gray-600">วันที่: ${date}</p>
            <p class="text-sm text-gray-600">ผู้อนุมัติ: ${firstName} ${lastName}</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0ab4ab',
        cancelButtonColor: '#d33'
      });

      if (!confirmResult.isConfirmed) {
        setIsApproving(false);
        return;
      }

      // Get the document reference for the selected ward and date
      const wardDocRef = doc(db, 'wardDailyRecords', `${date}_${wardId}`);
      
      // Update the approval status
      await updateDoc(wardDocRef, {
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: {
          uid: user?.uid || '',
          firstName: firstName,
          lastName: lastName,
          displayName: `${firstName} ${lastName}`,
          email: user?.email || ''
        }
      });
      
      // ลบข้อมูลจาก approvalQueue หลังจากอนุมัติแล้ว เพื่อลดข้อมูลที่ซ้ำซ้อน
      try {
        const approvalQueueRef = doc(db, 'approvalQueue', `${date}_${wardId}`);
        await deleteDoc(approvalQueueRef);
        console.log('Removed from approvalQueue:', `${date}_${wardId}`);
      } catch (error) {
        console.error('Error removing from approvalQueue:', error);
        // ไม่ต้องแจ้งเตือนผู้ใช้ เพราะข้อมูลหลักได้บันทึกไปแล้ว
      }

      // Add logging
      logEvent('approval_success', {
        wardId,
        date,
        action: 'Approve ข้อมูลสำเร็จ',
        approvedBy: `${firstName} ${lastName}`,
        approvedById: user?.uid,
        timestamp: new Date().toISOString()
      });

      // Show success message
      await SwalAlert.fire({
        title: 'อนุมัติสำเร็จ',
        text: `ข้อมูลของ ${wardId} ได้รับการอนุมัติแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
      
      // Reload the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error approving ward data:', error);
      
      await SwalAlert.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถอนุมัติข้อมูลได้ กรุณาลองอีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsApproving(true);
      
      // ขอลายเซ็นผู้ปฏิเสธก่อน
      const signatureResult = await SwalAlert.fire({
        title: 'ลงชื่อผู้ปฏิเสธ',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">กรุณากรอกชื่อผู้ปฏิเสธ</p>
            <div class="mb-3">
              <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              <input type="text" id="firstName" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ชื่อ" value="${user?.firstName || ''}">
            </div>
            <div class="mb-3">
              <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
              <input type="text" id="lastName" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="นามสกุล" value="${user?.lastName || ''}">
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0ab4ab',
        cancelButtonColor: '#d33',
        preConfirm: () => {
          const firstName = document.getElementById('firstName').value;
          const lastName = document.getElementById('lastName').value;
          
          if (!firstName.trim()) {
            SwalAlert.showValidationMessage('กรุณากรอกชื่อ');
            return false;
          }
          
          if (!lastName.trim()) {
            SwalAlert.showValidationMessage('กรุณากรอกนามสกุล');
            return false;
          }
          
          return { firstName, lastName };
        }
      });

      if (!signatureResult.isConfirmed) {
        setIsApproving(false);
        return;
      }

      const { firstName, lastName } = signatureResult.value;
      
      // Get reason for rejection
      const reasonResult = await SwalAlert.fire({
        title: 'ปฏิเสธข้อมูล Ward',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">กรุณาระบุเหตุผลในการปฏิเสธ:</p>
            <textarea id="rejection-reason" class="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3"></textarea>
            <p class="text-sm text-gray-600 mt-2">ผู้ปฏิเสธ: ${firstName} ${lastName}</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ปฏิเสธ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#0ab4ab',
        preConfirm: () => {
          const reason = document.getElementById('rejection-reason').value;
          if (!reason.trim()) {
            SwalAlert.showValidationMessage('กรุณาระบุเหตุผลในการปฏิเสธ');
          }
          return reason;
        }
      });

      if (!reasonResult.isConfirmed) {
        setIsApproving(false);
        return;
      }

      const rejectionReason = reasonResult.value;

      // Get the document reference
      const wardDocRef = doc(db, 'wardDailyRecords', `${date}_${wardId}`);
      
      // Update the approval status with rejection
      await updateDoc(wardDocRef, {
        approvalStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason,
        rejectedBy: {
          uid: user?.uid || '',
          firstName: firstName,
          lastName: lastName,
          displayName: `${firstName} ${lastName}`,
          email: user?.email || ''
        }
      });
      
      // ลบข้อมูลจาก approvalQueue หลังจากปฏิเสธแล้ว
      try {
        const approvalQueueRef = doc(db, 'approvalQueue', `${date}_${wardId}`);
        await deleteDoc(approvalQueueRef);
        console.log('Removed from approvalQueue:', `${date}_${wardId}`);
      } catch (error) {
        console.error('Error removing from approvalQueue:', error);
      }

      // Add logging
      logEvent('rejection_success', {
        wardId,
        date,
        action: 'ปฏิเสธข้อมูล',
        rejectedBy: `${firstName} ${lastName}`,
        rejectedById: user?.uid,
        reason: rejectionReason,
        timestamp: new Date().toISOString()
      });

      // Show success message
      await SwalAlert.fire({
        title: 'ปฏิเสธข้อมูลสำเร็จ',
        text: `ข้อมูลของ ${wardId} ถูกปฏิเสธแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
      
      // Reload the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting ward data:', error);
      
      await SwalAlert.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถปฏิเสธข้อมูลได้ กรุณาลองอีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Display approved badge if already approved
  if (status === 'approved') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <svg className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        อนุมัติแล้ว
      </div>
    );
  }

  // Display rejected badge if rejected
  if (status === 'rejected') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <svg className="h-4 w-4 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        ปฏิเสธแล้ว
      </div>
    );
  }

  // ถ้าเป็น supervisor หรือ admin และสถานะยังรออนุมัติ ให้แสดงปุ่ม approve และ reject
  if (canApprove && status === 'pending') {
    return (
      <div className="flex space-x-2">
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isApproving ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
        </button>
        <button
          onClick={handleReject}
          disabled={isApproving}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          {isApproving ? 'กำลังดำเนินการ...' : 'ปฏิเสธ'}
        </button>
      </div>
    );
  }

  // Default: แสดงสถานะ "รออนุมัติ" สำหรับผู้ใช้ทั่วไป
  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <svg className="h-4 w-4 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      รออนุมัติ
    </div>
  );
};

export default ApproveButton;