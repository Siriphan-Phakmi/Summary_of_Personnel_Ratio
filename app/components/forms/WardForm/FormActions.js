'use client';

/**
 * FormActions Module
 * 
 * แยกฟังก์ชันที่เกี่ยวข้องกับการจัดการการบันทึกฟอร์ม
 */

import { doc, setDoc, collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { validateFormBeforeSave } from './DataHandlers';
import AlertUtil from '../../../utils/AlertUtil';
import React from 'react';
import DataComparisonModal from './DataComparisonModal';
import { Swal } from '../../../utils/alertService';

// ฟังก์ชันสำหรับตรวจสอบฉบับร่างที่มีอยู่แล้ว
async function checkExistingDraft(date, wardId, shift) {
    try {
        console.log("checkExistingDraft params:", { date, wardId, shift });
        
        // สำหรับทดสอบ: จำลองการพบฉบับร่างเสมอ
        const isTesting = true; // เปลี่ยนเป็น false เมื่อต้องการใช้งานจริง
        
        if (isTesting) {
            console.log("TESTING MODE: Returning mock draft data");
            return {
                exists: true,
                data: {
                    id: "test_draft_id_" + Date.now(),
                    date: date,
                    wardId: wardId,
                    shift: shift,
                    status: 'draft',
                    department: "Ward11",
                    patientCensusData: {
                        hospitalPatientcensus: 10,
                        newAdmit: 2,
                        transferIn: 1,
                        referIn: 1,
                        transferOut: 1,
                        referOut: 1,
                        discharge: 1,
                        dead: 1
                    },
                    personnelData: {
                        nurseManager: 1,
                        RN: 5,
                        PN: 2,
                        WC: 1
                    },
                    notes: {
                        general: "ทดสอบหมายเหตุ"
                    },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: {
                        uid: "test_uid",
                        firstName: "ทดสอบ",
                        lastName: "ระบบ",
                        email: "test@example.com"
                    }
                }
            };
        }
        
        const draftRef = query(
            collection(db, 'wardDataDrafts'),
            where('date', '==', date),
            where('wardId', '==', wardId),
            where('shift', '==', shift)
        );
        
        const draftSnapshots = await getDocs(draftRef);
        console.log("Firestore query result:", { 
            empty: draftSnapshots.empty,
            size: draftSnapshots.size,
            docs: draftSnapshots.docs.map(doc => ({ id: doc.id }))
        });
        
        if (!draftSnapshots.empty) {
            // มีข้อมูลฉบับร่างอยู่แล้ว
            const draftData = draftSnapshots.docs[0].data();
            console.log("Found existing draft:", draftData);
            return {
                exists: true,
                data: {
                    id: draftSnapshots.docs[0].id,
                    ...draftData
                }
            };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('Error checking existing draft:', error);
        return { exists: false, error };
    }
}

/**
 * saveFormData - บันทึกข้อมูลลงใน Firestore
 * @param {Object} dataToSave - ข้อมูลที่จะบันทึก
 * @returns {Object|null} - ข้อมูลผลลัพธ์หรือ null กรณีเกิดข้อผิดพลาด
 */
export const saveFormData = async (dataToSave) => {
    try {
        console.log('Start saving form data to Firestore:', dataToSave);
        console.log('Firebase db instance:', db ? 'Available' : 'Not available');

        // เตรียมข้อมูลสำหรับบันทึก - แปลง Date objects เป็น serverTimestamp
        const firestoreData = {
            ...dataToSave,
            updatedAt: serverTimestamp()
        };

        if (!firestoreData.createdAt) {
            firestoreData.createdAt = serverTimestamp();
        }

        // กำหนดคอลเลคชันตามสถานะของข้อมูล (draft หรือ final)
        const collectionName = dataToSave.status === 'final' ? 'wardDataFinal' : 'wardDataDrafts';
        console.log(`Saving to collection: ${collectionName}`);

        // สร้าง document ID ที่เหมาะสม
        const docId = dataToSave.id || `${dataToSave.date}_${dataToSave.wardId}_${dataToSave.shift}`;
        console.log(`Generated document ID: ${docId}`);

        try {
            // บันทึกข้อมูลลงใน Firestore
            console.log('Attempting to save document...');
            const docRef = doc(db, collectionName, docId);
            await setDoc(docRef, firestoreData);
            console.log(`Document saved to ${collectionName} with ID: ${docId}`);
            
            return { id: docId };
        } catch (innerError) {
            console.error('Inner error while saving to Firestore:', innerError);
            
            // ลองตรวจสอบเพิ่มเติมเกี่ยวกับ Firebase connection
            console.log('Checking Firebase connection status...');
            if (!db) {
                console.error('Firebase db is not initialized properly');
                throw new Error('Firebase database not initialized');
            }
            
            throw innerError;
        }
    } catch (error) {
        console.error('Error saving data to Firestore:', error);
        throw error;
    }
};

/**
 * แสดงข้อความแจ้งเตือน
 * @param {string} title หัวข้อ
 * @param {string} text ข้อความ
 * @param {string} icon ไอคอน
 * @param {string} confirmButtonText ข้อความปุ่มยืนยัน
 * @returns 
 */
export function showAlert(title, text, icon = 'info', confirmButtonText = 'ตกลง') {
    if (typeof document === 'undefined') {
        return null; // server-side
    }
    try {
        return AlertUtil.alert(title, text, {
            type: icon,
            autoClose: 0,
            buttons: [
                {
                    text: confirmButtonText,
                    variant: 'primary'
                }
            ]
        });
    } catch (error) {
        console.error('Error showing alert:', error);
        alert(`${title}: ${text}`);
        return null;
    }
}

/**
 * แสดงกล่องข้อความยืนยัน
 * @param {string} title หัวข้อ
 * @param {string} text ข้อความ
 * @param {string} confirmText ข้อความปุ่มยืนยัน
 * @param {string} cancelText ข้อความปุ่มยกเลิก
 * @returns {Promise<boolean>}
 */
export function showConfirm(title, text, confirmText = 'ตกลง', cancelText = 'ยกเลิก') {
    if (typeof document === 'undefined') {
        return Promise.resolve(false); // server-side
    }
    try {
        return AlertUtil.confirm(title, text, {
            confirmText,
            cancelText
        });
    } catch (error) {
        console.error('Error showing confirm dialog:', error);
        const result = window.confirm(`${title}: ${text}`);
        return Promise.resolve(result);
    }
}

/**
 * showDataComparisonModal - แสดงหน้าต่างเปรียบเทียบข้อมูลโดยใช้ AlertUtil.custom และ DataComparisonModal
 */
export const showDataComparisonModal = async (existingData, newData) => {
    console.log("Showing data comparison modal");
    console.log("Existing data:", existingData);
    console.log("New data:", newData);
    
    try {
        // ใช้ AlertUtil.custom เพื่อแสดง DataComparisonModal
        return new Promise((resolve) => {
            // สร้างฟังก์ชัน event handler สำหรับปุ่มต่างๆ
            const handleAction = (action) => {
                console.log("Action triggered:", action);
                clearTimeout(timeoutId);
                resolve({ isConfirmed: true, action });
            };
            
            const handleCancel = () => {
                console.log("Cancel triggered");
                clearTimeout(timeoutId);
                resolve({ isConfirmed: false });
            };
            
            // กำหนด timeout สำหรับกรณีที่ modal ค้าง
            const timeoutId = setTimeout(() => {
                console.log("Modal timeout triggered - forcing close");
                resolve({ isConfirmed: false, timedOut: true });
            }, 60000); // 60 วินาที timeout
            
            const modalInstance = AlertUtil.custom({
                component: ({ onClose }) => (
                    <DataComparisonModal
                        isOpen={true}
                        onClose={() => {
                            console.log("Modal close requested");
                            onClose();
                            handleCancel();
                        }}
                        onSave={(action) => {
                            console.log("Modal save requested with action:", action);
                            onClose();
                            handleAction(action);
                        }}
                        existingData={existingData}
                        newData={newData}
                        theme={'light'}
                        mode={'compare'} // 'compare' mode แสดงข้อมูลเปรียบเทียบละเอียด
                    />
                ),
                closeOnOutsideClick: false,
                containerClassName: "pointer-events-auto"
            });
            
            // เพิ่มตัวแปรระดับ window สำหรับปิด modal ในกรณีฉุกเฉิน
            if (typeof window !== 'undefined') {
                window.__closeDataComparisonModal = () => {
                    console.log("Emergency close triggered");
                    clearTimeout(timeoutId);
                    resolve({
                        isConfirmed: false,
                        emergency: true
                    });
                    delete window.__closeDataComparisonModal;
                };
            }
        });
    } catch (error) {
        console.error("Error showing data comparison modal:", error);
        return {
            isConfirmed: false,
            error: true
        };
    }
};

/**
 * createOnSaveDraft - สร้างฟังก์ชันสำหรับการบันทึกฉบับร่าง
 */
export const createOnSaveDraft = (
    formData, 
    setFormData, 
    selectedDate, 
    selectedWard, 
    selectedShift, 
    setIsSubmitting, 
    setIsDraftMode, 
    setHasUnsavedChanges, 
    user
) => {
    // ฟังก์ชันบันทึกข้อมูล
    const saveDraftData = async (dataToSave, existingDraftData = null) => {
        try {
            let continueWithSave = false;
            
            // เรียกใช้ Modal เปรียบเทียบข้อมูลหรือ confirm ตามความเหมาะสม
            if (existingDraftData) {
                // กรณีมีข้อมูลเดิม ให้แสดง DataComparisonModal
                const confirmResult = await showDataComparisonModal(existingDraftData, dataToSave);
                if (confirmResult.isConfirmed) {
                    continueWithSave = true;
                    // ถ้ามีการเลือกวิธีการบันทึก (preserve) ให้นำไปใช้
                    if (confirmResult.action === 'preserve') {
                        // ปรับปรุงข้อมูลโดยรักษาข้อมูลเดิมที่มีค่าในช่องที่ข้อมูลใหม่ว่างเปล่า
                        console.log("User selected to preserve existing data");
                        dataToSave = preserveExistingData(existingDraftData, dataToSave);
                        console.log("Data after preservation:", dataToSave);
                    } else {
                        console.log("User selected to overwrite all data");
                    }
                } else {
                    console.log("User cancelled draft save after comparison");
                    return { success: false, message: 'User cancelled after comparison' };
                }
            } else {
                // กรณีไม่มีข้อมูลเดิม ให้แสดง Confirm ธรรมดา
                const result = await Swal.fire({
                    title: 'ยืนยันการบันทึกฉบับร่าง',
                    html: '<div>คุณต้องการบันทึกฉบับร่างหรือไม่?</div>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'บันทึกทับ',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#0ab4ab',
                    cancelButtonColor: '#d33',
                    focusCancel: false,
                    customClass: {
                        container: 'swal-container',
                        popup: 'swal-popup shadow-lg',
                        title: 'swal-title',
                        htmlContainer: 'swal-html-container',
                        confirmButton: 'swal-confirm-button',
                        cancelButton: 'swal-cancel-button'
                    }
                });

                if (result.isConfirmed) {
                    continueWithSave = true;
                } else {
                    console.log("User cancelled draft save");
                    return { success: false, message: 'User cancelled' };
                }
            }
            
            // ดำเนินการบันทึกหากผู้ใช้ยืนยัน
            if (continueWithSave) {
                console.log("Saving draft data:", dataToSave);
                const saveResult = await saveFormData(dataToSave);
                console.log("Save result:", saveResult);
                
                if (saveResult) {
                    // อัพเดทข้อมูลในฟอร์ม
                    setFormData(prev => ({ ...prev, id: saveResult.id }));
                    
                    // แสดง popup แจ้งเตือนเมื่อบันทึกสำเร็จ (ใช้ AlertUtil)
                    try {
                        await AlertUtil.success('บันทึกสำเร็จ', 'บันทึกเป็นฉบับร่างเรียบร้อยแล้ว', {
                            autoClose: 2000,
                        });
                    } catch (error) {
                        console.error('Error showing success alert:', error);
                        alert('บันทึกสำเร็จ: บันทึกเป็นฉบับร่างเรียบร้อยแล้ว');
                    }
                    
                    // รีเซ็ตสถานะการเปลี่ยนแปลง
                    setHasUnsavedChanges(false);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error in saveDraftData:', error);
            throw error;
        }
    };
    
    return async () => {
        console.log("Saving draft...");
        console.log("Form data:", formData);
        console.log("Selected date:", selectedDate);
        console.log("Selected ward:", selectedWard);
        console.log("Selected shift:", selectedShift);
        console.log("User:", user);
        
        // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
        if (!selectedDate || !selectedWard || !selectedShift) {
            await showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวันที่, วอร์ด และกะการทำงาน', 'error');
            return;
        }

        if (!user.department) {
            await showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุแผนกของคุณในหน้าโปรไฟล์', 'error');
            return;
        }
        
        try {
            setIsSubmitting(true);
            setIsDraftMode(true);
            
            // ตรวจสอบความถูกต้องก่อนบันทึก
            const validationResult = await validateFormBeforeSave(formData, 'draft');
            if (!validationResult.valid) {
                // แสดงข้อความเตือนและโฟกัสไปที่ฟิลด์ที่มีปัญหา
                await showAlert('ไม่สามารถบันทึกข้อมูลได้', validationResult.message, 'error');
                
                console.log("Validation failed for draft:", validationResult);
                
                setIsSubmitting(false);
                setIsDraftMode(false);
                return;
            }

            // เตรียมข้อมูลสำหรับบันทึก
            const dateString = selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate;
            
            // ตรวจสอบว่ามีฉบับร่างอยู่แล้วหรือไม่
            console.log("Checking for existing draft with:", { date: dateString, wardId: selectedWard, shift: selectedShift });
            const existingDraftResult = await checkExistingDraft(dateString, selectedWard, selectedShift);
            console.log("Existing draft check result:", existingDraftResult);
            
            const dataToSave = {
                ...formData,
                date: dateString,
                wardId: selectedWard,
                shift: selectedShift,
                status: 'draft',
                department: user.department,
                createdBy: {
                    uid: user.uid,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || ''
                },
                updatedAt: new Date()
            };

            // สำหรับเอกสารใหม่
            if (!formData.id) {
                dataToSave.createdAt = new Date();
            }
            
            // ถ้ามีฉบับร่างอยู่แล้ว ต้องเตรียมข้อมูลสำหรับการเปรียบเทียบ
            if (existingDraftResult.exists) {
                // ปรับปรุงข้อมูลสำหรับรองรับการเลือก 'preserve' ใน DataComparisonModal
                const result = await saveDraftData(dataToSave, existingDraftResult.data);
                if (!result) {
                    console.log("Failed to save draft after comparison");
                    setIsSubmitting(false);
                    setIsDraftMode(false);
                    return false;
                }
            } else {
                // ไม่มีฉบับร่างอยู่แล้ว บันทึกข้อมูลได้เลย
                const result = await saveDraftData(dataToSave);
                if (!result) {
                    console.log("Failed to save new draft");
                    setIsSubmitting(false);
                    setIsDraftMode(false);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error saving draft:', error);
            await showAlert('เกิดข้อผิดพลาด', `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
            setIsDraftMode(false);
        }
    };
};

/**
 * createOnSubmit - สร้างฟังก์ชันสำหรับการบันทึกฉบับสมบูรณ์
 */
export const createOnSubmit = (
    formData, 
    setFormData, 
    selectedDate, 
    selectedWard, 
    selectedShift, 
    setIsSubmitting, 
    setIsDraftMode, 
    setHasUnsavedChanges, 
    user
) => {
    return async () => {
        console.log("Submitting final form...");
        
        // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
        if (!selectedDate || !selectedWard || !selectedShift) {
            await showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวันที่, วอร์ด และกะการทำงาน', 'error');
            return;
        }

        if (!user.department) {
            await showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุแผนกของคุณในหน้าโปรไฟล์', 'error');
            return;
        }
        
        try {
            // ขอคำยืนยันก่อนบันทึกแบบ final
            const confirmResult = await showConfirm(
                'ยืนยันการบันทึก',
                'คุณต้องการบันทึกข้อมูลเป็นฉบับสมบูรณ์ใช่หรือไม่? หลังจากบันทึกแล้วจะไม่สามารถแก้ไขได้อีก',
                'ตกลง',
                'ยกเลิก'
            );
            
            // Check the isConfirmed property of the AlertUtil result
            if (!confirmResult.isConfirmed) {
                console.log("User cancelled the final submission");
                return;
            }
            
            setIsSubmitting(true);
            setIsDraftMode(false);
            
            // ตรวจสอบความถูกต้องก่อนบันทึก
            const validationResult = await validateFormBeforeSave(formData, 'final');
            if (!validationResult.valid) {
                // แสดงข้อความเตือนและโฟกัสไปที่ฟิลด์ที่มีปัญหา
                await showAlert('ไม่สามารถบันทึกข้อมูลได้', validationResult.message, 'error');
                
                // ฟิลด์ถูกโฟกัสแล้วในฟังก์ชัน validateFormBeforeSave
                console.log("Validation failed for final submit:", validationResult);
                
                setIsSubmitting(false);
                return;
            }
            
            // เตรียมข้อมูลสำหรับบันทึก
            const dataToSave = {
                ...formData,
                date: selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate,
                wardId: selectedWard,
                shift: selectedShift,
                status: 'final',
                department: user.department,
                createdBy: {
                    uid: user.uid,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || ''
                },
                finalizedAt: new Date(),
                updatedAt: new Date()
            };

            // สำหรับเอกสารใหม่
            if (!formData.id) {
                dataToSave.createdAt = new Date();
            }

            // บันทึกข้อมูล
            console.log("Saving final data:", dataToSave);
            const result = await saveFormData(dataToSave);
            console.log("Save result:", result);
            
            if (result) {
                // อัพเดทข้อมูลในฟอร์ม
                setFormData(prev => ({ ...prev, id: result.id, status: 'final' }));
                
                // แสดง popup แจ้งเตือนเมื่อบันทึกสำเร็จ (ใช้ AlertUtil)
                try {
                    await AlertUtil.success('บันทึกสำเร็จ', 'บันทึกเป็นฉบับสมบูรณ์เรียบร้อยแล้ว', {
                        autoClose: 2000,
                    });
                } catch (error) {
                    console.error('Error showing success alert:', error);
                    alert('บันทึกสำเร็จ: บันทึกเป็นฉบับสมบูรณ์เรียบร้อยแล้ว');
                }
                
                // รีเซ็ตสถานะการเปลี่ยนแปลง
                setHasUnsavedChanges(false);
            }
            
            return true;
        } catch (error) {
            console.error('Error submitting data:', error);
            await showAlert('เกิดข้อผิดพลาด', `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
};

/**
 * handleWardFormSubmit - ฟังก์ชันจัดการการส่งฟอร์ม
 */
export const handleWardFormSubmit = (e, onSubmit) => {
    e.preventDefault();
    if (onSubmit && typeof onSubmit === 'function') {
        onSubmit();
    }
};

/**
 * createHandleCancel - สร้างฟังก์ชันสำหรับยกเลิกการแก้ไข
 */
export const createHandleCancel = (resetForm, initialFormData, setFormData, setHasUnsavedChanges) => {
    return async () => {
        // ตรวจสอบว่ามีการแก้ไขหรือไม่
        const confirmResult = await showConfirm(
            'ยืนยันการยกเลิก',
            'คุณต้องการยกเลิกการแก้ไขและรีเซ็ตฟอร์มใช่หรือไม่?'
        );
        
        if (confirmResult.isConfirmed) {
            // รีเซ็ตฟอร์ม
            resetForm(setFormData, initialFormData, setHasUnsavedChanges);
        }
    };
};

/**
 * preserveExistingData - รักษาข้อมูลเดิมในช่องที่ข้อมูลใหม่ว่างเปล่า
 * @param {Object} existingData - ข้อมูลที่มีอยู่แล้ว
 * @param {Object} newData - ข้อมูลใหม่ที่จะบันทึกทับ
 * @returns {Object} - ข้อมูลที่ผสมกันแล้ว
 */
export const preserveExistingData = (existingData, newData) => {
    // สร้างสำเนาข้อมูลเพื่อไม่ให้กระทบข้อมูลเดิม
    const mergedData = { ...newData };
    
    // ฟังก์ชันตรวจสอบและแทนที่ฟิลด์ที่ว่างเปล่า
    const preserveField = (mergedObj, existingObj, key) => {
        const newValue = mergedObj[key];
        const oldValue = existingObj[key];
        
        // ถ้าข้อมูลใหม่ว่างเปล่าแต่ข้อมูลเดิมมีค่า ให้ใช้ข้อมูลเดิม
        if ((newValue === undefined || newValue === null || newValue === '') && 
            (oldValue !== undefined && oldValue !== null && oldValue !== '')) {
            mergedObj[key] = oldValue;
        }
    };
    
    // ข้อมูล Patient Census
    if (existingData.patientCensusData && mergedData.patientCensusData) {
        for (const key in existingData.patientCensusData) {
            preserveField(mergedData.patientCensusData, existingData.patientCensusData, key);
        }
    }
    
    // ข้อมูลบุคลากร
    if (existingData.personnelData && mergedData.personnelData) {
        for (const key in existingData.personnelData) {
            preserveField(mergedData.personnelData, existingData.personnelData, key);
        }
    }
    
    // ข้อมูลหมายเหตุ
    if (existingData.notes && mergedData.notes) {
        for (const key in existingData.notes) {
            preserveField(mergedData.notes, existingData.notes, key);
        }
    }
    
    return mergedData;
};