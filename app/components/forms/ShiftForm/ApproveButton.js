'use client';
import React from 'react';
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Swal } from '../../../utils/alertService';
import { logEvent } from '../../../utils/clientLogging';
import { useAuth } from '../../../context/AuthContext';

const ApproveButton = ({ wardId, date, status = 'pending' }) => {
  const [isApproving, setIsApproving] = useState(false);
  const { user } = useAuth();

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      
      // Confirm before approving
      const confirmResult = await Swal.fire({
        title: 'Approve Ward Data',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">Are you sure you want to approve data for ${wardId}?</p>
            <p class="text-sm text-gray-600">Date: ${date}</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Approve',
        cancelButtonText: 'Cancel',
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
        approvedAt: new Date().toISOString()
      });

      // Add logging
      logEvent('approval_success', {
        wardId,
        date,
        action: 'Approve ข้อมูลสำเร็จ',
        approvedBy: user?.displayName,
        approvedById: user?.uid,
        timestamp: new Date().toISOString()
      });

      // Show success message
      await Swal.fire({
        title: 'Approved Successfully',
        text: `Data for ${wardId} has been approved`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
    } catch (error) {
      console.error('Error approving ward data:', error);
      
      await Swal.fire({
        title: 'Error',
        text: 'Failed to approve ward data. Please try again.',
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
      
      // Get reason for rejection
      const reasonResult = await Swal.fire({
        title: 'Reject Ward Data',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">Please provide a reason for rejection:</p>
            <textarea id="rejection-reason" class="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3"></textarea>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#0ab4ab',
        preConfirm: () => {
          const reason = document.getElementById('rejection-reason').value;
          if (!reason.trim()) {
            Swal.showValidationMessage('Please provide a reason for rejection');
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
        rejectionReason: rejectionReason
      });

      // Add logging
      logEvent('rejection_success', {
        wardId,
        date,
        action: 'Reject ข้อมูลสำเร็จ',
        rejectedBy: user?.displayName,
        rejectedById: user?.uid,
        rejectionReason: rejectionReason,
        timestamp: new Date().toISOString()
      });

      // Show success message
      await Swal.fire({
        title: 'Rejected Successfully',
        text: `Data for ${wardId} has been rejected`,
        icon: 'info',
        confirmButtonColor: '#0ab4ab'
      });
    } catch (error) {
      console.error('Error rejecting ward data:', error);
      
      await Swal.fire({
        title: 'Error',
        text: 'Failed to reject ward data. Please try again.',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Render appropriate button based on status
  if (status === 'approved') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <svg className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Approved
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <svg className="h-4 w-4 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Rejected
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleApprove}
        disabled={isApproving}
        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {isApproving ? 'Processing...' : 'Approve'}
      </button>
      <button
        onClick={handleReject}
        disabled={isApproving}
        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
      >
        {isApproving ? 'Processing...' : 'Reject'}
      </button>
    </div>
  );
};

export default ApproveButton;