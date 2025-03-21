'use client';

/**
 * FormActions Module
 * 
 * แยกฟังก์ชันที่เกี่ยวข้องกับการจัดการการบันทึกฟอร์ม
 */

import { doc, setDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { validateFormBeforeSave } from './DataHandlers';
import AlertUtil from '../../../utils/AlertUtil';

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
            const validationResult = validateFormBeforeSave(formData, 'draft');
            if (!validationResult.valid) {
                // แสดงข้อความเตือนและโฟกัสไปที่ฟิลด์ที่มีปัญหา
                await showAlert('ไม่สามารถบันทึกข้อมูลได้', validationResult.message, 'error');
                
                // ฟิลด์ถูกโฟกัสแล้วในฟังก์ชัน validateFormBeforeSave
                console.log("Validation failed for draft:", validationResult);
                
                setIsSubmitting(false);
                setIsDraftMode(false);
                return;
            }

            // เตรียมข้อมูลสำหรับบันทึก
            const dataToSave = {
                ...formData,
                date: selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate,
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

            // บันทึกข้อมูล
            console.log("Saving draft data:", dataToSave);
            const result = await saveFormData(dataToSave);
            console.log("Save result:", result);
            
            if (result) {
                // อัพเดทข้อมูลในฟอร์ม
                setFormData(prev => ({ ...prev, id: result.id }));
                
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
            const validationResult = validateFormBeforeSave(formData, 'final');
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

export default {
    createOnSaveDraft,
    createOnSubmit,
    handleWardFormSubmit,
    createHandleCancel
}; 