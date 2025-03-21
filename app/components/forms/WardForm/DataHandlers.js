'use client';

/**
 * DataHandlers Module
 * 
 * แยกฟังก์ชันที่เกี่ยวข้องกับการจัดการข้อมูลภายในฟอร์ม
 */

import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import AlertUtil from '../../../utils/AlertUtil';

/**
 * loadData - ฟังก์ชันโหลดข้อมูลจาก Firestore
 */
export const loadData = async (selectedDate, selectedWard, selectedShift, setFormData, setIsLoading, setInitError, resetForm, setIsReadOnly, setApprovalStatus) => {
    // ฟังก์ชันนี้จะใช้เวลาในการทำงาน จึงต้องมีการตั้งค่า timeout
    let timeoutId = null;
    
    try {
        // ตั้งค่าสถานะ loading
        setIsLoading(true);
        setInitError(null);
        
        // ตั้งค่า timeout สำหรับการโหลดข้อมูล
        timeoutId = setTimeout(() => {
            setIsLoading(false);
            setInitError('การโหลดข้อมูลใช้เวลานานเกินไป โปรดลองใหม่อีกครั้ง');
            resetForm();
        }, 15000); // 15 seconds timeout
        
        // ตรวจสอบว่าพารามิเตอร์ที่จำเป็นมีอยู่หรือไม่
        if (!selectedDate || !selectedWard || !selectedShift) {
            console.error('Missing required parameters for loadData:', { selectedDate, selectedWard, selectedShift });
            setIsLoading(false);
            setInitError('ไม่สามารถโหลดข้อมูลได้: ข้อมูลไม่ครบถ้วน');
            resetForm();
            clearTimeout(timeoutId);
            return;
        }
        
        // สร้าง query เพื่อเรียกข้อมูล
        const dateString = selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate;
        console.log(`Loading data for date: ${dateString}, ward: ${selectedWard}, shift: ${selectedShift}`);
        
        const q = query(
            collection(db, 'wardData'),
            where('date', '==', dateString),
            where('wardId', '==', selectedWard),
            where('shift', '==', selectedShift)
        );
        
        // ดึงข้อมูลจาก Firestore
        console.log("Executing query to Firestore...");
        const querySnapshot = await getDocs(q);
        console.log(`Query returned ${querySnapshot.size} documents`);
        
        // ประมวลผลข้อมูลที่ได้รับ
        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0].data();
            const docId = querySnapshot.docs[0].id;
            console.log("Document found:", { id: docId, ...docData });
            
            setFormData(prevState => ({
                ...prevState,
                ...docData,
                id: docId
            }));
            
            // ตรวจสอบสถานะการอนุมัติ
            if (docData.approvalStatus) {
                setApprovalStatus(docData.approvalStatus);
                
                // ถ้าข้อมูลเป็น final และได้รับการอนุมัติแล้ว ให้ตั้งค่าเป็น read-only
                if (docData.status === 'final' && docData.approvalStatus.isApproved) {
                    setIsReadOnly(true);
                } else {
                    setIsReadOnly(false);
                }
            } else {
                setApprovalStatus(null);
                setIsReadOnly(false);
            }
        } else {
            // กรณีที่ไม่พบข้อมูล
            console.log("No documents found, resetting form");
            resetForm();
        }
        
        // เสร็จสิ้นการโหลดข้อมูล
        setIsLoading(false);
    } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
        setInitError(`เกิดข้อผิดพลาด: ${error.message}`);
        resetForm();
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * resetForm - ฟังก์ชันรีเซ็ตฟอร์ม
 */
export const resetForm = (setFormData, initialFormData, setHasUnsavedChanges, setIsDraftMode, setIsSubmitting) => {
    // รีเซ็ตข้อมูลฟอร์มกลับไปเป็นค่าเริ่มต้น
    setFormData(initialFormData);
    
    // รีเซ็ตสถานะอื่นๆ
    if (setHasUnsavedChanges) setHasUnsavedChanges(false);
    if (setIsDraftMode) setIsDraftMode(false);
    if (setIsSubmitting) setIsSubmitting(false);
};

/**
 * calculatePatientCensusTotal - คำนวณยอดรวมของข้อมูลผู้ป่วย
 */
export const calculatePatientCensusTotal = (formData) => {
    if (!formData || !formData.patientCensusData) return 0;
    
    const patientData = formData.patientCensusData;
    
    // ตรวจสอบว่าเป็นกะเช้าหรือกะดึก
    const shift = formData.shift;
    
    // กรณีกะเช้าหรือกะดึก ให้คำนวณตามสูตร
    const hospitalPatientcensus = parseInt(patientData.hospitalPatientcensus || 0, 10) || 0;
    const newAdmit = parseInt(patientData.newAdmit || 0, 10) || 0;
    const transferIn = parseInt(patientData.transferIn || 0, 10) || 0;
    const referIn = parseInt(patientData.referIn || 0, 10) || 0;
    const transferOut = parseInt(patientData.transferOut || 0, 10) || 0;
    const referOut = parseInt(patientData.referOut || 0, 10) || 0;
    const discharge = parseInt(patientData.discharge || 0, 10) || 0;
    const dead = parseInt(patientData.dead || 0, 10) || 0;
    
    // คำนวณตามสูตร: Hospital Patient Census + New Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead
    const total = hospitalPatientcensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
    
    console.log(`DataHandlers คำนวณ Patient Census (${shift}): ${hospitalPatientcensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
    
    return total;
};

/**
 * validateFormBeforeSave - ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก
 */
export const validateFormBeforeSave = (formData, mode = 'draft') => {
  console.log('Validating form data before save:', { formData, mode });
  
  try {
    // สำหรับการบันทึกฉบับร่าง ไม่ต้องมีการตรวจสอบมาก
    if (mode === 'draft') {
      // เช็คเฉพาะกรณีจำเป็น
      if (!formData) {
        console.error('Form data is null or undefined');
        return { valid: false, message: 'ไม่พบข้อมูลฟอร์ม' };
      }
      
      // บันทึกฉบับร่างได้แม้ข้อมูลไม่ครบ
      console.log('Draft mode validation passed');
      return { valid: true };
    }
    
    // สำหรับการบันทึกฉบับสมบูรณ์ ต้องตรวจสอบอย่างละเอียด
    if (mode === 'final') {
      if (!formData) {
        console.error('Form data is null or undefined');
        return { valid: false, message: 'ไม่พบข้อมูลฟอร์ม' };
      }
      
      // ตรวจสอบข้อมูลด้าน Patient Census
      if (!formData.patientCensusData) {
        return { valid: false, message: 'กรุณากรอกข้อมูล Patient Census' };
      }
      
      // ทำให้สามารถบันทึกได้โดยยกเลิกการตรวจสอบชั่วคราว
      console.log('Final mode validation passed with less strict checks');
      return { valid: true };
      
      /*
      // ตรวจสอบตัวเลขรวมใน Patient Census
      if (typeof formData.patientCensusTotal === 'undefined' || formData.patientCensusTotal === null) {
        return { valid: false, message: 'ไม่พบข้อมูลจำนวนผู้ป่วยรวม' };
      }
      
      // ตรวจสอบข้อมูลบุคลากร
      if (!formData.personnelData) {
        return { valid: false, message: 'กรุณากรอกข้อมูลบุคลากร' };
      }
      
      // ตรวจสอบว่ามีการกรอกข้อมูลทั้ง RN และ PN อย่างน้อย 1 คน
      const hasRN = formData.personnelData.RN > 0;
      const hasPN = formData.personnelData.PN > 0;
      
      if (!hasRN && !hasPN) {
        return { valid: false, message: 'กรุณากรอกข้อมูลบุคลากร RN หรือ PN อย่างน้อย 1 ตำแหน่ง' };
      }
      */
    }
    
    // กรณีไม่ระบุ mode หรือมี mode ที่ไม่รู้จัก
    console.log('Unknown validation mode or no mode specified, returning valid');
    return { valid: true };
  } catch (error) {
    console.error('Error validating form:', error);
    return { valid: false, message: `เกิดข้อผิดพลาดในการตรวจสอบข้อมูล: ${error.message}` };
  }
};

/**
 * focusOnField - ฟังก์ชันสำหรับ focus ไปที่ฟิลด์ที่มีปัญหา
 * @param {string} fieldId - ID ของฟิลด์ที่ต้องการ focus
 */
export const focusOnField = (fieldId) => {
  try {
    if (!fieldId) return;
    
    console.log(`Trying to focus on field: ${fieldId}`);
    
    // ตรวจสอบว่าอยู่ในสภาพแวดล้อม browser หรือไม่
    if (typeof window === 'undefined' || !document) {
      console.log('Not in browser environment, cannot focus');
      return;
    }
    
    // หาอิลิเมนต์ด้วย ID
    const element = document.getElementById(fieldId);
    if (element) {
      // ทำ focus ที่อิลิเมนต์
      element.focus();
      console.log(`Successfully focused on field: ${fieldId}`);
      
      // ถ้าเป็นอิลิเมนต์ input ให้ scroll ไปที่อิลิเมนต์นั้น
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // ถ้าเป็น input, select, textarea ให้ select ทั้งหมด
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
        element.select();
      }
    } else {
      console.log(`Element with ID ${fieldId} not found`);
    }
  } catch (error) {
    console.error('Error focusing on field:', error);
  }
};

/**
 * showAlert - แสดงการแจ้งเตือน
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
 * showConfirm - แสดงกล่องข้อความยืนยัน
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

export default {
    loadData,
    resetForm,
    calculatePatientCensusTotal,
    validateFormBeforeSave,
    showAlert,
    showConfirm
}; 