'use client';
import React from 'react';

/**
 * Component แสดงสถานะการอนุมัติในรูปแบบ badge
 */
const ApprovalStatusIndicator = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          label: 'อนุมัติแล้ว',
          icon: '✅'
        };
      case 'rejected':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          label: 'ไม่อนุมัติ',
          icon: '❌'
        };
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200',
          label: 'รออนุมัติ',
          icon: '⏳'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          label: 'ไม่ระบุสถานะ',
          icon: '❓'
        };
    }
  };

  const { bg, text, border, label, icon } = getStatusStyles();

  return (
    <div className={`${bg} ${text} ${border} border px-4 py-3 rounded-lg`}>
      <div className="flex items-center gap-2 font-medium">
        <span>{icon}</span> 
        <span>สถานะ: {label}</span>
      </div>
      <div className="mt-1 text-sm opacity-80">
        {status === 'pending' 
          ? 'ข้อมูลนี้กำลังรอการอนุมัติจาก Supervisor' 
          : status === 'approved'
          ? 'ข้อมูลนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้อีก'
          : status === 'rejected'
          ? 'ข้อมูลนี้ไม่ได้รับการอนุมัติ กรุณาแก้ไขและบันทึกใหม่'
          : 'ไม่พบข้อมูลสถานะการอนุมัติ'
        }
      </div>
    </div>
  );
};

export default ApprovalStatusIndicator; 