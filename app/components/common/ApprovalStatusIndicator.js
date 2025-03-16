'use client';
import React from 'react';

const ApprovalStatusIndicator = ({ status, isDraftMode }) => {
    if (!status) return null;
    
    let statusText = 'รอการอนุมัติ';
    let bgColor = 'bg-yellow-100';
    let textColor = 'text-yellow-800';
    let icon = (
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
    
    if (status === 'approved' || (typeof status === 'object' && status.status === 'approved')) {
        statusText = 'อนุมัติแล้ว';
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        );
    } else if (status === 'not_recorded' || (typeof status === 'object' && status.status === 'not_recorded')) {
        statusText = 'ยังไม่มีการบันทึก';
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        icon = (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
    } else if (status === 'draft' || (typeof status === 'object' && status.status === 'draft') || isDraftMode) {
        statusText = 'ฉบับร่าง';
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        icon = (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        );
    }
    
    return (
        <div className={`px-3 py-1.5 ${bgColor} ${textColor} rounded-md flex items-center font-medium text-sm`}>
            {icon}
            <span>{statusText}</span>
        </div>
    );
};

export default ApprovalStatusIndicator; 