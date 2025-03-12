'use client';
import React from 'react';
import { useState } from 'react';
import { Swal } from '../../../utils/alertService';
import { checkApprovalStatus, fetchWardData } from './DataFetchers';
import { parseInputValue } from './FormHandlers';
import { formatThaiDate } from '../../../utils/dateUtils';

export const handleBeforeUnload = (hasUnsavedChanges, e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
    }
};

export const handleInputChange = (e, formData, setFormData, setHasUnsavedChanges) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs: convert empty strings to '0' and validate numbers
    const processedValue = name !== 'notes' ? parseInputValue(value) : value;
    
    setFormData(prev => ({
        ...prev,
        [name]: processedValue
    }));
    
    setHasUnsavedChanges(true);
};

export const handleShiftChange = (shift, setSelectedShift) => {
    setSelectedShift(shift);
};

export const handleDateSelect = async (
    date,
    selectedWard,
    selectedShift,
    setSelectedDate,
    setThaiDate,
    setShowCalendar,
    setApprovalStatus,
    setFormData
) => {
    try {
        if (!date || !selectedWard || !selectedShift) {
            console.warn('handleDateSelect: Missing required parameters', {
                date,
                selectedWard,
                selectedShift
            });
            return;
        }

        // อัพเดทวันที่และปิดปฏิทิน
        setSelectedDate(date);
        setThaiDate(formatThaiDate(date));
        if (setShowCalendar) {
            setShowCalendar(false);
        }
        
        // ตรวจสอบสถานะการอนุมัติ
        if (setApprovalStatus) {
            const status = await checkApprovalStatus(date, selectedWard);
            setApprovalStatus(status);
        }
        
        // ดึงข้อมูล ward
        if (setFormData) {
            const wardData = await fetchWardData(date, selectedWard, selectedShift);
            if (wardData) {
                setFormData(prevData => ({
                    ...prevData,
                    ...wardData
                }));
            }
        }
    } catch (error) {
        console.error('Error in handleDateSelect:', error);
        Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
            icon: 'error',
            confirmButtonColor: '#0ab4ab'
        });
    }
}; 