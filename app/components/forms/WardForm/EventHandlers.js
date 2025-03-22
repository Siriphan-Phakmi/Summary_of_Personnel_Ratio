'use client';
import React from 'react';
import { useState } from 'react';
import { SwalAlert } from '../../../utils/alertService';
import { checkApprovalStatus, fetchWardData, fetchPreviousWardData } from './DataFetchers';
import { parseInputValue } from './FormHandlers';
import { formatThaiDate } from '../../../utils/dateUtils';
import { handleFirebaseIndexError } from './index';
import { format } from 'date-fns';
import { validateFormBeforeSave, showAlert, showConfirm } from './DataHandlers';
import AlertUtil from '../../../utils/AlertUtil';

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
    // Import dynamically to avoid circular references
    const { default: Popup } = await import('../../../components/Popup');
    
    // If there are no unsaved changes, just change the shift
    if (!hasUnsavedChanges) {
        setSelectedShift(shift);
        return true;
    }
    
    // Create a promise that will be resolved when the user makes a choice
    return new Promise((resolve) => {
        // Create a container for our popup
        const popupContainer = document.createElement('div');
        popupContainer.id = 'shift-change-popup-container';
        document.body.appendChild(popupContainer);
        
        // Track if the popup is currently open
        let popupOpen = true;
        
        // Function to remove the popup container
        const cleanupPopup = () => {
            if (popupContainer && popupContainer.parentNode) {
                popupContainer.parentNode.removeChild(popupContainer);
                popupOpen = false;
            }
        };
        
        // Create popup buttons
        const buttons = [
            {
                text: 'ไม่, ยกเลิก',
                color: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
                onClick: () => {
                    cleanupPopup();
                    resolve(false); // User canceled the shift change
                }
            },
            {
                text: 'บันทึกแบบร่างก่อน',
                color: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                onClick: async () => {
                    if (typeof onSaveDraft === 'function') {
                        const saveResult = await onSaveDraft();
                        if (saveResult && saveResult.success) {
                            setSelectedShift(shift);
                            cleanupPopup();
                            resolve(true); // Saved draft and confirmed shift change
                        } else {
                            // Draft save failed, keep popup open
                            console.error('Failed to save draft');
                        }
                    }
                },
                closeOnClick: false
            },
            {
                text: 'ใช่, เปลี่ยนกะการทำงาน',
                color: 'bg-blue-500 hover:bg-blue-600 text-white',
                onClick: () => {
                    setSelectedShift(shift);
                    cleanupPopup();
                    resolve(true); // User confirmed the shift change
                }
            }
        ];
        
        // Render the popup
        const root = ReactDOM.createRoot(popupContainer);
        root.render(
            <Popup
                type="warning"
                title="ข้อมูลที่ยังไม่ได้บันทึก"
                message="คุณต้องการเปลี่ยนกะการทำงานหรือไม่? ข้อมูลที่ยังไม่ได้บันทึกจะหายไป"
                isOpen={true}
                onClose={() => {
                    cleanupPopup();
                    resolve(false); // User closed the popup without making a choice
                }}
                buttons={buttons}
                autoClose={0} // Don't auto-close
            />
        );
        
        // Add emergency close function to window for debugging
        window.__closeShiftChangePopup = () => {
            if (popupOpen) {
                cleanupPopup();
                resolve(false);
                console.log('Shift change popup emergency closed');
            }
        };
    });
};

/**
 * สร้างฟังก์ชันสำหรับจัดการการเลือกวันที่
 * @param {Date} date วันที่ที่เลือก
 * @param {function} setSelectedDate ฟังก์ชันสำหรับตั้งค่าวันที่ที่เลือก
 * @param {function} setThaiDate ฟังก์ชันสำหรับตั้งค่าวันที่ภาษาไทย
 * @param {string} selectedWard รหัสวอร์ดที่เลือก
 * @param {function} setApprovalStatus ฟังก์ชันสำหรับตั้งค่าสถานะการอนุมัติ
 * @param {function} setFormData ฟังก์ชันสำหรับตั้งค่าข้อมูลฟอร์ม
 * @param {boolean} hasUnsavedChanges มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึกหรือไม่
 * @returns {function} ฟังก์ชันที่ใช้จัดการการเลือกวันที่
 */
export const handleDateSelect = (
    setSelectedDate,
    setThaiDate,
    selectedWard,
    setApprovalStatus,
    setFormData,
    hasUnsavedChanges,
    shift
) => {
    return async (date) => {
        try {
            // ตรวจสอบการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
            if (hasUnsavedChanges) {
                const confirmLeave = window.confirm('คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนวันที่?');
                if (!confirmLeave) {
                    return;
                }
            }
            
            // ตรวจสอบความถูกต้องของวันที่
            if (!date || !isValid(date)) {
                console.error('Invalid date selected:', date);
                return;
            }
            
            // แปลงวันที่เป็นรูปแบบที่ต้องการ
            const formattedDate = format(date, 'yyyy-MM-dd');
            setSelectedDate(formattedDate);
            setThaiDate(formatThaiDate(date));
            
            // ตรวจสอบกะดึกวันก่อนหน้า
            try {
                const previousNightResult = await checkPreviousNightShiftData(formattedDate, selectedWard);
                if (!previousNightResult.exists) {
                    // แสดงการแจ้งเตือน
                    await SwalAlert.fire({
                        title: 'พบปัญหาข้อมูลกะดึกของวันก่อนหน้า',
                        html: previousNightResult.message || 'ไม่พบข้อมูลกะดึกของวันก่อนหน้า หรือข้อมูลยังไม่ได้บันทึกเป็น Final<br>กรุณาตรวจสอบข้อมูลกะดึกของวันก่อนหน้า',
                        icon: 'warning',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else if (previousNightResult.exists && !previousNightResult.isFinal) {
                    // แสดงการแจ้งเตือนว่ามีข้อมูลแต่ยังไม่เป็น Final
                    await SwalAlert.fire({
                        title: 'ข้อมูลกะดึกของวันก่อนหน้ายังไม่สมบูรณ์',
                        html: 'ข้อมูลกะดึกของวันก่อนหน้ายังไม่ได้บันทึกเป็น Final<br>กรุณาตรวจสอบและบันทึก Final ข้อมูลกะดึกของวันก่อนหน้า',
                        icon: 'info',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
            } catch (error) {
                console.error('Error checking previous night shift data:', error);
            }
            
            // ตรวจสอบข้อมูล 7 วันย้อนหลัง
            try {
                const past7DaysResult = await checkPast7DaysData(formattedDate, selectedWard);
                if (!past7DaysResult.complete) {
                    // แสดงการแจ้งเตือน
                    await SwalAlert.fire({
                        title: 'ข้อมูล 7 วันย้อนหลังไม่ครบถ้วน',
                        html: `พบวันที่ยังไม่ได้บันทึกข้อมูลในช่วง 7 วันย้อนหลัง:<br><ul class="mt-2 text-left list-disc pl-5">${past7DaysResult.missingDates.map(d => `<li>${formatThaiDate(d)}</li>`).join('')}</ul>`,
                        icon: 'warning',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
            } catch (error) {
                console.error('Error checking past 7 days data:', error);
            }
            
            // ตรวจสอบสถานะการอนุมัติ
            try {
                if (setApprovalStatus && selectedWard) {
                    const status = await checkApprovalStatus(formattedDate, shift, selectedWard);
                    setApprovalStatus(status);
                }
            } catch (error) {
                console.error('Error checking approval status:', error);
            }
            
            // โหลดข้อมูลอัตโนมัติ
            try {
                const { data, hasData, sourceMessage } = await fetchAndPrepareWardData(formattedDate, selectedWard, shift);
                if (hasData && data) {
                    setFormData(data);
                    
                    // แจ้งเตือนว่าโหลดข้อมูลอัตโนมัติ
                    if (sourceMessage) {
                        await SwalAlert.fire({
                            title: 'โหลดข้อมูลอัตโนมัติ',
                            text: sourceMessage,
                            icon: 'info',
                            confirmButtonColor: '#0ab4ab'
                        });
                    }
                } else {
                    // รีเซ็ตฟอร์มเป็นค่าว่าง
                    setFormData({
                        patientCensus: {
                            hospitalPatientcensus: '',
                            newAdmit: '',
                            transferIn: '',
                            referIn: '',
                            transferOut: '',
                            referOut: '',
                            discharge: '',
                            dead: '',
                            total: ''
                        },
                        staffing: {
                            nurseManager: '',
                            RN: '',
                            PN: '',
                            WC: '',
                            NA: ''
                        },
                        notes: {
                            comment: ''
                        },
                        bedManagement: {
                            available: '',
                            unavailable: '',
                            plannedDischarge: ''
                        },
                        overallData: ''
                    });
                }
            } catch (error) {
                console.error('Error loading data for the selected date:', error);
                // แจ้งเตือนข้อผิดพลาด
                await SwalAlert.fire({
                    title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
                    text: error.message || 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error in handleDateSelect:', error);
        }
    };
};

/**
 * createHandleDateChange - สร้างฟังก์ชันสำหรับการเปลี่ยนวันที่
 */
export const createHandleDateChange = (setSelectedDate, setThaiDate, formatThaiDate, setHasUnsavedChanges) => {
    return (date) => {
        if (date) {
            setSelectedDate(date);
            if (setThaiDate && formatThaiDate) {
                setThaiDate(formatThaiDate(date));
            }
            if (setHasUnsavedChanges) {
                setHasUnsavedChanges(true);
            }
        }
    };
};

/**
 * createHandleShiftChange - สร้างฟังก์ชันสำหรับการเปลี่ยนกะ
 */
export const createHandleShiftChange = (setSelectedShift, setHasUnsavedChanges) => {
    return (shift) => {
        setSelectedShift(shift);
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
    };
};

/**
 * createHandleBeforeUnload - สร้างฟังก์ชันสำหรับการเตือนเมื่อผู้ใช้พยายามปิดหน้าที่มีการแก้ไขแล้วไม่ได้บันทึก
 */
export const createHandleBeforeUnload = (hasUnsavedChanges) => {
    return (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires returnValue to be set
            return 'คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?';
        }
    };
};

// เพิ่มฟังก์ชันสำหรับยืนยันการบันทึกร่าง
export const createHandleSaveDraft = (onSaveDraft) => {
    return async () => {
        const result = await SwalAlert.fire({
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
        
        const result = await SwalAlert.fire({
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
            const result = await SwalAlert.fire({
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