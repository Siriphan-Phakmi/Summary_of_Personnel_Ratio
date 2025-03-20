'use client';
import React from 'react';
import { useState } from 'react';
import { Swal } from '../../../utils/alertService';
import { checkApprovalStatus, fetchWardData, fetchPreviousWardData } from './DataFetchers';
import { parseInputValue } from './FormHandlers';
import { formatThaiDate } from '../../../utils/dateUtils';
import { handleFirebaseIndexError } from './index';
import { format } from 'date-fns';

// เพิ่ม state สำหรับติดตามว่ากำลังดึงข้อมูลหรือไม่
let isFetchingData = false;

export const handleBeforeUnload = (hasUnsavedChanges, e) => {
    // ใช้ SweetAlert2 แทน browser dialog
    e.preventDefault();
    e.returnValue = '';
    
    // จำเป็นต้อง return string สำหรับ browser onbeforeunload event
    // แต่ในตอนใช้งานจริงจะแสดง SweetAlert ก่อนที่จะให้ออกจากหน้าเว็บ
    return hasUnsavedChanges ? 
        'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?' : 
        'คุณแน่ใจหรือไม่ว่าต้องการรีเฟรชหน้านี้? การรีเฟรชจะทำให้ข้อมูลที่กำลังดำเนินการอยู่หายไป';
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

export const handleShiftChange = async (shift, setSelectedShift, hasUnsavedChanges = false, onSaveDraft = null) => {
    // ตรวจสอบว่า setSelectedShift เป็นฟังก์ชันหรือไม่ก่อนเรียกใช้
    if (typeof setSelectedShift !== 'function') {
        console.warn('handleShiftChange: setSelectedShift is not a function');
        return;
    }
    
    // ถามยืนยันก่อนเปลี่ยนกะผ่าน SweetAlert
    const message = hasUnsavedChanges ? 
        'คุณมีข้อมูลที่ยังไม่ได้บันทึก หากเปลี่ยนกะการทำงาน ข้อมูลที่คุณกำลังกรอกอยู่จะหายไปทั้งหมด' : 
        'การเปลี่ยนกะจะทำให้ข้อมูลที่คุณกำลังกรอกอยู่หายไปทั้งหมด';
    
    const result = await Swal.fire({
        title: 'ยืนยันการเปลี่ยนกะการทำงาน',
        html: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0ab4ab',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, เปลี่ยนกะ',
        cancelButtonText: 'ยกเลิก',
        showDenyButton: hasUnsavedChanges,
        denyButtonText: 'บันทึกแบบร่างก่อน',
        denyButtonColor: '#3085d6'
    });
    
    if (result.isConfirmed) {
        // ผู้ใช้ยืนยันแล้ว ให้เปลี่ยนกะได้เลย
        setSelectedShift(shift);
    } else if (result.isDenied && hasUnsavedChanges && typeof onSaveDraft === 'function') {
        // ผู้ใช้เลือกบันทึกแบบร่างก่อน
        const saveResult = await onSaveDraft();
        if (saveResult && saveResult.success) {
            setSelectedShift(shift);
        }
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
    setFormData,
    hasUnsavedChanges = false,
    onSaveDraft = null
) => {
    // ตรวจสอบว่ากำลังดึงข้อมูลอยู่หรือไม่
    if (isFetchingData) {
        console.log('Already fetching data, ignoring this request');
        return;
    }
    
    // ถ้ามีข้อมูลที่ยังไม่ได้บันทึก ให้ยืนยันกับผู้ใช้ก่อน
    if (hasUnsavedChanges) {
        const result = await Swal.fire({
            title: 'ยืนยันการเปลี่ยนวันที่',
            html: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก หากเปลี่ยนวันที่ ข้อมูลที่คุณกำลังกรอกอยู่จะหายไปทั้งหมด',
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            denyButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, เปลี่ยนวันที่',
            denyButtonText: 'บันทึกแบบร่างก่อน',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (result.isDismissed) {
            return; // ผู้ใช้ยกเลิก
        }
        
        if (result.isDenied && typeof onSaveDraft === 'function') {
            // บันทึกแบบร่าง
            const saveResult = await onSaveDraft();
            if (!saveResult || !saveResult.success) {
                return; // การบันทึกล้มเหลว
            }
        }
        
        // ถ้าผู้ใช้เลือก "ใช่, เปลี่ยนวันที่" หรือบันทึกแบบร่างสำเร็จแล้ว ก็ดำเนินการต่อ
    } else {
        // แม้ไม่มีข้อมูลที่ยังไม่ได้บันทึก แต่ยังคงต้องยืนยันการเปลี่ยนวันที่
        const result = await Swal.fire({
            title: 'ยืนยันการเปลี่ยนวันที่',
            html: 'คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนวันที่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, เปลี่ยนวันที่',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (result.isDismissed) {
            return; // ผู้ใช้ยกเลิก
        }
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

export const createHandleDateChange = (
    hasUnsavedChanges, 
    setAlertConfig, 
    proceedDateChange, 
    onSaveDraft
) => {
    return async (e) => {
        // ใช้ SweetAlert แทน setAlertConfig
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'ข้อมูลยังไม่ได้บันทึก',
                html: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก หากเปลี่ยนวันที่ ข้อมูลที่คุณกำลังกรอกอยู่จะหายไปทั้งหมด',
                icon: 'warning',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                denyButtonColor: '#3085d6',
                confirmButtonText: 'ใช่, เปลี่ยนวันที่',
                denyButtonText: 'บันทึกแบบร่างก่อน',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (result.isConfirmed) {
                // ดำเนินการเปลี่ยนวันที่
                await proceedDateChange(e);
            } else if (result.isDenied) {
                // บันทึกแบบร่างก่อนเปลี่ยนวันที่
                const saveResult = await onSaveDraft();
                if (saveResult && saveResult.success) {
                    await proceedDateChange(e);
                }
            }
        } else {
            // ถามยืนยันการเปลี่ยนวันที่ แม้ไม่มีข้อมูลที่ยังไม่ได้บันทึก
            const result = await Swal.fire({
                title: 'ยืนยันการเปลี่ยนวันที่',
                text: 'คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนวันที่?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ใช่, เปลี่ยนวันที่',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (result.isConfirmed) {
                await proceedDateChange(e);
            }
        }
    };
};

export const createProceedDateChange = (
    setSelectedDate, 
    selectedShift, 
    selectedWard, 
    setFormData, 
    setIsLoading, 
    setInitError
) => {
    // ... existing code ...
};

export const createHandleShiftChange = (
    hasUnsavedChanges, 
    setAlertConfig, 
    proceedShiftChange, 
    onSaveDraft
) => {
    return async (shift) => {
        // ใช้ SweetAlert แทน setAlertConfig
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'ข้อมูลยังไม่ได้บันทึก',
                html: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก หากเปลี่ยนกะการทำงาน ข้อมูลที่คุณกำลังกรอกอยู่จะหายไปทั้งหมด',
                icon: 'warning',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                denyButtonColor: '#3085d6',
                confirmButtonText: 'ใช่, เปลี่ยนกะ',
                denyButtonText: 'บันทึกแบบร่างก่อน',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (result.isConfirmed) {
                // ดำเนินการเปลี่ยนกะ
                await proceedShiftChange(shift);
            } else if (result.isDenied) {
                // บันทึกแบบร่างก่อนเปลี่ยนกะ
                const saveResult = await onSaveDraft();
                if (saveResult && saveResult.success) {
                    await proceedShiftChange(shift);
                }
            }
        } else {
            // ถามยืนยันการเปลี่ยนกะ แม้ไม่มีข้อมูลที่ยังไม่ได้บันทึก
            const result = await Swal.fire({
                title: 'ยืนยันการเปลี่ยนกะการทำงาน',
                text: 'คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนกะการทำงาน?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ใช่, เปลี่ยนกะ',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (result.isConfirmed) {
                await proceedShiftChange(shift);
            }
        }
    };
};

export const createProceedShiftChange = (
    setSelectedShift, 
    selectedDate, 
    selectedWard, 
    setFormData, 
    setIsLoading, 
    setInitError
) => {
    // ... existing code ...
};

export const createHandleBeforeUnload = (hasUnsavedChanges) => {
    return (e) => {
        return handleBeforeUnload(hasUnsavedChanges, e);
    };
};

// เพิ่มฟังก์ชันสำหรับยืนยันการบันทึกร่าง
export const createHandleSaveDraft = (onSaveDraft) => {
    return async () => {
        const result = await Swal.fire({
            title: 'ยืนยันการบันทึกแบบร่าง',
            text: 'คุณต้องการบันทึกข้อมูลแบบร่างหรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, บันทึกร่าง',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (result.isConfirmed && typeof onSaveDraft === 'function') {
            return await onSaveDraft();
        }
        
        return { success: false, canceled: true };
    };
};

// เพิ่มฟังก์ชันสำหรับยืนยันการส่งฟอร์ม
export const createHandleSubmit = (onSubmit, validateForm = null) => {
    return async () => {
        // ตรวจสอบความถูกต้องของฟอร์มก่อน ถ้ามีฟังก์ชัน validateForm
        if (typeof validateForm === 'function') {
            const isValid = await validateForm();
            if (!isValid) {
                return { success: false, error: 'ฟอร์มไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและกรอกให้ครบถ้วน' };
            }
        }
        
        const result = await Swal.fire({
            title: 'ยืนยันการบันทึกข้อมูล',
            html: 'คุณแน่ใจหรือไม่ว่าต้องการบันทึกข้อมูลนี้?<br>การบันทึกข้อมูลจะถือว่าข้อมูลนี้เป็นข้อมูลทางการ',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, บันทึกข้อมูล',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (result.isConfirmed && typeof onSubmit === 'function') {
            return await onSubmit();
        }
        
        return { success: false, canceled: true };
    };
};

// เพิ่มฟังก์ชันสำหรับยืนยันการยกเลิก
export const createHandleCancel = (hasUnsavedChanges, onCancel) => {
    return async () => {
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'ยืนยันการยกเลิก',
                html: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก<br>คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการกรอกข้อมูล?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ใช่, ยกเลิกการกรอกข้อมูล',
                cancelButtonText: 'ไม่, ฉันต้องการกรอกข้อมูลต่อ'
            });
            
            if (result.isConfirmed && typeof onCancel === 'function') {
                return await onCancel();
            }
            
            return { success: false, canceled: true };
        } else {
            // ไม่มีข้อมูลที่ยังไม่ได้บันทึก สามารถยกเลิกได้เลย
            if (typeof onCancel === 'function') {
                return await onCancel();
            }
            
            return { success: true };
        }
    };
};