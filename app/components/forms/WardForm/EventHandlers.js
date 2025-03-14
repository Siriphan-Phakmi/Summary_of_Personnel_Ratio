'use client';
import React from 'react';
import { useState } from 'react';
import { Swal } from '../../../utils/alertService';
import { checkApprovalStatus, fetchWardData } from './DataFetchers';
import { parseInputValue } from './FormHandlers';
import { formatThaiDate } from '../../../utils/dateUtils';
import { handleFirebaseIndexError } from './index';

// เพิ่ม state สำหรับติดตามว่ากำลังดึงข้อมูลหรือไม่
let isFetchingData = false;

export const handleBeforeUnload = (hasUnsavedChanges, e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
    }
};

export const handleInputChange = (e, formData, setFormData, setHasUnsavedChanges) => {
    const { name, value } = e.target;
    
    // ไม่ต้องแปลงค่า ใช้ค่าที่ป้อนเข้ามาโดยตรง
    setFormData(prev => ({
        ...prev,
        [name]: value
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
    // ตรวจสอบว่ากำลังดึงข้อมูลอยู่หรือไม่
    if (isFetchingData) {
        console.log('Already fetching data, ignoring this request');
        return;
    }
    
    try {
        isFetchingData = true;  // กำลังเริ่มดึงข้อมูล
        
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
        
        // แสดง loading indicator
        const loadingSwal = Swal.fire({
            title: 'กำลังโหลดข้อมูล',
            text: `กำลังดึงข้อมูลของ ${selectedWard} วันที่ ${formatThaiDate(date)}`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // ตรวจสอบสถานะการอนุมัติ
        if (setApprovalStatus) {
            try {
                const status = await checkApprovalStatus(date, selectedWard);
                setApprovalStatus(status);
            } catch (error) {
                console.error('Error checking approval status:', error);
                // ตรวจสอบว่าเป็น index error หรือไม่
                handleFirebaseIndexError(error);
            }
        }
        
        // ดึงข้อมูล ward
        if (setFormData) {
            try {
                const wardData = await fetchWardData(date, selectedWard, selectedShift);
                if (wardData) {
                    setFormData(prevData => ({
                        ...prevData,
                        ...wardData
                    }));
                }
            } catch (error) {
                console.error('Error fetching ward data:', error);
                // ตรวจสอบว่าเป็น index error หรือไม่
                if (!handleFirebaseIndexError(error)) {
                    Swal.fire({
                        title: 'เกิดข้อผิดพลาด',
                        text: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                        icon: 'error',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
            }
        }
        
        // ปิด loading indicator
        Swal.close();
        
    } catch (error) {
        console.error('Error in handleDateSelect:', error);
        Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
            icon: 'error',
            confirmButtonColor: '#0ab4ab'
        });
    } finally {
        isFetchingData = false;  // ดึงข้อมูลเสร็จแล้ว
    }
};