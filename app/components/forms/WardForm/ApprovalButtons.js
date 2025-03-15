'use client';
import React from 'react';
import { Swal } from '../../../utils/alertService';
import { formatThaiDate } from '../../../utils/dateUtils';

export const ApprovalDataButton = ({ approvalStatus, latestRecordDate }) => {
    const handleClick = () => {
        Swal.fire({
            title: 'สถานะการอนุมัติ',
            icon: approvalStatus === 'approved' ? 'success' : 'info',
            html: `<div class="text-left p-4">
                <p class="font-medium">${approvalStatus === 'approved' ? 'ข้อมูลนี้ได้รับการอนุมัติแล้ว' : 'ข้อมูลนี้ยังไม่ได้รับการอนุมัติ'}</p>
                ${approvalStatus === 'approved' ? '<p class="text-green-600 mt-2">✓ ข้อมูลนี้ผ่านการตรวจสอบแล้ว</p>' : '<p class="text-yellow-600 mt-2">⚠️ ข้อมูลนี้ยังรอการตรวจสอบ</p>'}
            </div>`,
            confirmButtonColor: '#0ab4ab'
        });
    };

    return (
        <button
            type="button"
            className={`px-2 py-1 text-xs rounded focus:outline-none ${approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
            onClick={handleClick}
        >
            {approvalStatus === 'approved' ? '✓ อนุมัติแล้ว' : '⚠️ รอการอนุมัติ'}
        </button>
    );
};

export const LatestRecordButton = ({ latestRecordDate }) => {
    const handleClick = () => {
        if (!latestRecordDate) return;

        Swal.fire({
            title: 'ข้อมูลล่าสุด',
            icon: 'info',
            html: `<div class="text-left p-4">
                <p class="font-medium">ข้อมูลล่าสุดบันทึกเมื่อ:</p>
                <p class="text-blue-600 mt-2">${formatThaiDate(latestRecordDate)}</p>
            </div>`,
            confirmButtonColor: '#0ab4ab'
        });
    };

    return (
        <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 focus:outline-none"
            onClick={handleClick}
        >
            ข้อมูลล่าสุด
        </button>
    );
}; 