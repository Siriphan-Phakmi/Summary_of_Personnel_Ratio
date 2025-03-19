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
    // ยืนยันทุกครั้งที่มีการ refresh หน้า ไม่ว่าจะมีข้อมูลที่ยังไม่ได้บันทึกหรือไม่ก็ตาม
    e.preventDefault();
    e.returnValue = '';
    if (hasUnsavedChanges) {
        return 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
    } else {
        return 'คุณแน่ใจหรือไม่ว่าต้องการรีเฟรชหน้านี้? การรีเฟรชจะทำให้ข้อมูลที่กำลังดำเนินการอยู่หายไป';
    }
};

export const handleInputChange = (e, formData, setFormData, setHasUnsavedChanges) => {
    const { name, value } = e.target;
    
    // รายชื่อฟิลด์ที่ต้องเป็นตัวเลขเท่านั้น
    const numericFields = [
        'nurseManager', 'RN', 'PN', 'WC', 'NA', 
        'newAdmit', 'transferIn', 'referIn', 
        'transferOut', 'referOut', 'discharge', 'dead',
        'availableBeds', 'unavailable', 'plannedDischarge'
    ];
    
    let finalValue = value;
    
    // ตรวจสอบว่าเป็นฟิลด์ที่ต้องเป็นตัวเลขหรือไม่
    if (numericFields.includes(name)) {
        // ถ้าเป็นฟิลด์ที่ต้องเป็นตัวเลข ให้ตรวจสอบค่าที่กรอก
        // ยอมรับเฉพาะตัวเลขเท่านั้น (ไม่รวมทศนิยม)
        finalValue = value.replace(/[^0-9]/g, '');
    }
    
    // ปรับปรุงค่าที่กรอกเข้ามา
    try {
        if (setFormData) {
            setFormData(prev => ({
                ...prev,
                [name]: finalValue
            }));
        }
        
        // อัพเดทสถานะมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
    } catch (error) {
        console.error('Error in handleInputChange:', error, { name, value, finalValue });
    }
};

export const handleShiftChange = (shift, setSelectedShift) => {
    // ตรวจสอบว่า setSelectedShift เป็นฟังก์ชันหรือไม่ก่อนเรียกใช้
    if (typeof setSelectedShift === 'function') {
        // ถามยืนยันก่อนเปลี่ยนกะ เนื่องจากข้อมูลจะหายไป
        const confirmed = window.confirm(
            'คุณกำลังเปลี่ยนกะการทำงาน\n\n' +
            'การเปลี่ยนกะจะทำให้ข้อมูลที่คุณกำลังกรอกอยู่หายไปทั้งหมด\n\n' +
            'คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนกะ?'
        );
        
        if (confirmed) {
            setSelectedShift(shift);
        }
    } else {
        console.warn('handleShiftChange: setSelectedShift is not a function');
    }
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
        
        // ตรวจสอบ user จาก sessionStorage เพื่อใช้ department โดยตรง
        const userStr = sessionStorage.getItem('user');
        let department = '';
        
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                department = userData.department || '';
            } catch (e) {
                console.error('Error parsing user data from sessionStorage:', e);
            }
        }
        
        // ใช้ department จาก user ไม่ใช่ selectedWard
        const wardId = department || selectedWard;
        
        if (!date || !wardId || !selectedShift) {
            console.warn('handleDateSelect: Missing required parameters', {
                date,
                wardId,
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
            text: `กำลังดึงข้อมูลของ ${wardId} วันที่ ${formatThaiDate(date)}`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // ตรวจสอบสถานะการอนุมัติ
        if (setApprovalStatus) {
            try {
                const status = await checkApprovalStatus(date, selectedShift, wardId);
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
                const wardData = await fetchWardData(date, wardId, selectedShift);
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