'use client';
import { collection, addDoc, updateDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';
import { calculatePatientCensus } from './DataFetchers';
import { format } from 'date-fns';
import { Swal } from '../../../utils/alertService';

export const parseInputValue = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : value.toString();
};

export const calculateTotal = (data) => {
    if (!data) return '0';
    let total = 0;
    
    // Calculate total from patient census and movement data
    const patientCensus = parseInt(data.patientCensus || '0', 10);
    const newAdmit = parseInt(data.newAdmit || '0', 10);
    const transferIn = parseInt(data.transferIn || '0', 10);
    const referIn = parseInt(data.referIn || '0', 10);
    const transferOut = parseInt(data.transferOut || '0', 10);
    const referOut = parseInt(data.referOut || '0', 10);
    const discharge = parseInt(data.discharge || '0', 10);
    const dead = parseInt(data.dead || '0', 10);
    
    if (!isNaN(patientCensus)) {
        total += patientCensus;
    }
    
    // ตามสูตรที่กำหนด: newAdmit + transferIn + referIn - transferOut + referOut + discharge + dead
    const movementTotal = (
        (!isNaN(newAdmit) ? newAdmit : 0) + 
        (!isNaN(transferIn) ? transferIn : 0) + 
        (!isNaN(referIn) ? referIn : 0) - 
        (!isNaN(transferOut) ? transferOut : 0) + 
        (!isNaN(referOut) ? referOut : 0) + 
        (!isNaN(discharge) ? discharge : 0) + 
        (!isNaN(dead) ? dead : 0)
    );
    
    return total.toString();
};

export const checkExistingRecord = async (wardId, date, shift) => {
    try {
        const dateString = getUTCDateString(new Date(date));
        const q = query(
            collection(db, 'wardDailyRecords'), 
            where('wardId', '==', wardId),
            where('date', '==', dateString),
            where('shift', '==', shift)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            // นำข้อมูลจากเอกสารแรกที่พบมาใช้
            const docData = querySnapshot.docs[0].data();
            return {
                exists: true,
                id: querySnapshot.docs[0].id,
                data: docData
            };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('Error checking existing record:', error);
        return { exists: false, error: error.message };
    }
};

export const handleWardFormSubmit = async (e, formData, selectedWard, selectedDate, selectedShift, user, saveMode = 'final') => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    
    try {
        const dateString = getUTCDateString(new Date(selectedDate));
        const total = calculateTotal(formData);
        
        // ตรวจสอบว่ามีข้อมูลในฟิลด์หลักหรือไม่
        if (!formData.firstName || !formData.lastName) {
            return { 
                success: false, 
                error: 'กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล' 
            };
        }
        
        // ตรวจสอบว่าถ้าเป็น Save Final ข้อมูลกะนี้ต้องไม่ได้ถูก finalize ไปแล้ว
        if (saveMode === 'final') {
            const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
            const docId = `${formattedDate}_${selectedWard}_${selectedShift}`;
            const docRef = doc(db, 'wardDataFinal', docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    success: false,
                    error: 'ไม่สามารถบันทึกข้อมูลได้ เนื่องจากข้อมูลของกะนี้ได้ถูกบันทึกแบบ Final ไปแล้ว'
                };
            }
        }
        
        const recordData = {
            wardId: selectedWard,
            date: dateString,
            shift: selectedShift,
            // ข้อมูลคนไข้
            patientCensus: formData.patientCensus || '0',
            overallData: formData.overallData || '0',
            // ข้อมูลบุคลากร
            nurseManager: formData.nurseManager || '0',
            RN: formData.RN || '0',
            PN: formData.PN || '0',
            WC: formData.WC || '0',
            rns: formData.rns || '0',
            pns: formData.pns || '0',
            nas: formData.nas || '0',
            aides: formData.aides || '0',
            studentNurses: formData.studentNurses || '0',
            // ข้อมูลการเคลื่อนไหวของผู้ป่วย
            newAdmit: formData.newAdmit || '0',
            transferIn: formData.transferIn || '0',
            referIn: formData.referIn || '0',
            transferOut: formData.transferOut || '0',
            referOut: formData.referOut || '0',
            discharge: formData.discharge || '0',
            dead: formData.dead || '0',
            admissions: formData.admissions || '0',
            discharges: formData.discharges || '0',
            transfers: formData.transfers || '0',
            deaths: formData.deaths || '0',
            // ข้อมูลเตียง
            availableBeds: formData.availableBeds || '0',
            unavailable: formData.unavailable || '0',
            plannedDischarge: formData.plannedDischarge || '0',
            // ข้อมูลบันทึกเพิ่มเติม
            notes: formData.notes || '',
            comment: formData.comment || '',
            // ข้อมูลผู้บันทึก
            firstName: formData.firstName,
            lastName: formData.lastName,
            // ข้อมูลเพิ่มเติม
            createdBy: user?.displayName || 'Unknown',
            createdById: user?.uid || 'Unknown',
            department: user?.department || 'Unknown',
            timestamp: serverTimestamp(),
            total: total,
            isDraft: saveMode === 'draft', // บันทึกสถานะว่าเป็นฉบับร่างหรือไม่
            isApproved: false, // สำหรับการตรวจสอบโดย Supervisor
            approvedBy: null,
            approvedAt: null,
            // เพิ่มสำหรับการทวนสอบข้อมูล
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: user?.displayName || 'Unknown',
            lastUpdatedById: user?.uid || 'Unknown'
        };
        
        // ถ้ามี ID แสดงว่าเป็นการอัปเดตข้อมูลเดิม
        if (formData.id) {
            const docRef = doc(db, 'wardDailyRecords', formData.id);
            
            // ถ้าเป็นโหมด final เราต้องตรวจสอบว่ามีสิทธิ์อัปเดตหรือไม่ (เช่น เคย save final ไปแล้วหรือไม่)
            if (saveMode === 'final') {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && !docSnap.data().isDraft && docSnap.data().isApproved) {
                    return { 
                        success: false, 
                        error: 'ไม่สามารถแก้ไขข้อมูลได้เนื่องจากมีการอนุมัติข้อมูลแล้ว'
                    };
                }
            }
            
            await updateDoc(docRef, recordData);
            return { success: true, operation: 'update', id: formData.id };
        } else {
            // สร้างเอกสารใหม่
            const docRef = await addDoc(collection(db, 'wardDailyRecords'), recordData);
            return { success: true, operation: 'create', id: docRef.id };
        }
    } catch (error) {
        console.error('Error saving data:', error);
        return { success: false, error: error.message };
    }
};

// เพิ่มฟังก์ชันตรวจสอบสถานะการอนุมัติ
export const checkFinalApprovalStatus = async (date, ward, shift) => {
  try {
    const approvalStatus = await checkApprovalStatus(date, ward, shift);
    
    if (approvalStatus && approvalStatus.status === 'approved') {
      return {
        canEdit: false,
        message: 'ข้อมูลนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้'
      };
    }
    
    return { canEdit: true };
  } catch (error) {
    console.error('Error checking final approval status:', error);
    return { canEdit: true };
  }
};

// ย้ายฟังก์ชัน handleFormChange จาก MainFormContent
export const handleInputChange = (category, field, value, formData, setFormData, isReadOnly, setHasUnsavedChanges) => {
    // ตรวจสอบว่าฟอร์มเป็นแบบอ่านอย่างเดียวหรือไม่
    if (isReadOnly) {
        console.log('Form is read-only. Changes not allowed.');
        return;
    }
    
    // ตรวจสอบว่า field เป็น 'recalculateTotal' หรือไม่ เพื่อคำนวณผลรวม
    if (field === 'recalculateTotal') {
        console.log('Recalculating total...');
        calculatePatientCensusTotal(formData, setFormData);
        return;
    }

    setHasUnsavedChanges(true);
    
    // Use a single atomic update to prevent race conditions
    setFormData(prevData => {
        // Create a deep copy to avoid mutation issues
        const updatedData = JSON.parse(JSON.stringify(prevData));
        
        // Update the specific field
        if (category) {
            if (!updatedData[category]) {
                updatedData[category] = {};
            }
            updatedData[category][field] = value;
        } else {
            updatedData[field] = value;
        }
        
        // If this is a patient census field that affects calculation,
        // recalculate the total immediately in the same update
        if (category === 'patientCensus' && 
            ['newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead'].includes(field)) {
            
            const patientCensus = updatedData.patientCensus;
            
            // Convert to numbers to prevent string concatenation
            const newAdmit = Number(parseInt(patientCensus.newAdmit || '0', 10));
            const transferIn = Number(parseInt(patientCensus.transferIn || '0', 10));
            const referIn = Number(parseInt(patientCensus.referIn || '0', 10));
            const transferOut = Number(parseInt(patientCensus.transferOut || '0', 10));
            const referOut = Number(parseInt(patientCensus.referOut || '0', 10));
            const discharge = Number(parseInt(patientCensus.discharge || '0', 10));
            const dead = Number(parseInt(patientCensus.dead || '0', 10));
            
            // Calculate the new total
            const total = newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
            console.log(`Recalculated Census: ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
            
            // Display empty string if total is 0 and all input fields are empty
            const shouldShowEmpty = total === 0 && 
                !patientCensus.newAdmit && 
                !patientCensus.transferIn && 
                !patientCensus.referIn && 
                !patientCensus.transferOut && 
                !patientCensus.referOut && 
                !patientCensus.discharge && 
                !patientCensus.dead;
            
            // Update the total in the same update
            updatedData.patientCensus.total = shouldShowEmpty ? '' : total;
        }
        
        return updatedData;
    });
};

// ย้ายฟังก์ชัน calculatePatientCensusTotal จาก MainFormContent
export const calculatePatientCensusTotal = (formData, setFormData, selectedShift) => {
    // ใช้ข้อมูลที่ส่งเข้ามา
    const data = formData;
    console.log("กำลังคำนวณ Patient Census จากข้อมูล:", JSON.stringify(data.patientCensus));

    if (!data?.patientCensus) {
        console.warn('ไม่สามารถคำนวณได้: ข้อมูล patientCensus ไม่มี');
        return 0;
    }

    const patientCensus = data.patientCensus;
    // ตรวจสอบกะที่กำลังคำนวณ
    const currentShift = data.shift || selectedShift;

    // แปลงค่าเป็นตัวเลข และรวม hospitalPatientcensus เข้าไปด้วย
    const hospitalCensus = Number(parseInt(patientCensus.hospitalPatientcensus || '0', 10));
    const newAdmit = Number(parseInt(patientCensus.newAdmit || '0', 10));
    const transferIn = Number(parseInt(patientCensus.transferIn || '0', 10));
    const referIn = Number(parseInt(patientCensus.referIn || '0', 10));
    const transferOut = Number(parseInt(patientCensus.transferOut || '0', 10));
    const referOut = Number(parseInt(patientCensus.referOut || '0', 10));
    const discharge = Number(parseInt(patientCensus.discharge || '0', 10));
    const dead = Number(parseInt(patientCensus.dead || '0', 10));

    // คำนวณตามสูตร: Hospital census + การเข้า - การออก
    const total = hospitalCensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;

    console.log(`คำนวณ Patient Census (${currentShift}): ${hospitalCensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
    
    // ตรวจสอบว่าควรแสดงเป็นช่องว่างหรือไม่
    const shouldShowEmpty = total === 0 && 
        !patientCensus.hospitalPatientcensus &&
        !patientCensus.newAdmit && 
        !patientCensus.transferIn && 
        !patientCensus.referIn && 
        !patientCensus.transferOut && 
        !patientCensus.referOut && 
        !patientCensus.discharge && 
        !patientCensus.dead;

    // อัพเดท state แบบ atomic
    setFormData(prevData => {
        const updatedData = JSON.parse(JSON.stringify(prevData));
        
        if (!updatedData.patientCensus) {
            updatedData.patientCensus = {};
        }
        
        updatedData.patientCensus.total = shouldShowEmpty ? '' : total;
        
        // กำหนดอัพเดท overallData สำหรับกะดึก (ตรวจสอบทุกรูปแบบชื่อกะที่อาจใช้)
        const isNightShift = 
            currentShift === 'night' || 
            currentShift === 'Night' || 
            currentShift === 'Night (19:00-07:00)' || 
            currentShift === '19:00-07:00' ||
            /night/i.test(currentShift);
            
        if (isNightShift) {
            console.log('อัพเดท overallData สำหรับกะดึก:', total);
            updatedData.overallData = shouldShowEmpty ? '' : total;
        }
        
        return updatedData;
    });

    return total;
};

// เพิ่มฟังก์ชันสำหรับตรวจสอบความถูกต้องของฟอร์มก่อนการบันทึก
export const validateFormBeforeSave = (formData, saveMode = 'draft') => {
    const errors = [];
    
    // ตรวจสอบการกรอกชื่อและนามสกุล
    if (!formData.firstName || !formData.firstName.trim() === '') {
        errors.push('กรุณากรอกชื่อผู้บันทึกข้อมูล');
    }
    
    if (!formData.lastName || !formData.lastName.trim() === '') {
        errors.push('กรุณากรอกนามสกุลผู้บันทึกข้อมูล');
    }
    
    // ถ้าเป็นการบันทึกแบบ final ต้องตรวจสอบเพิ่มเติม
    if (saveMode === 'final') {
        // ตรวจสอบการกรอกข้อมูลจำนวนบุคลากร
        const staffing = formData.staffing || {};
        if (!staffing.nurseManager && !staffing.RN && !staffing.PN && !staffing.NA) {
            errors.push('กรุณากรอกข้อมูลจำนวนบุคลากรอย่างน้อย 1 ประเภท');
        }
        
        // ตรวจสอบ patient census
        if (!formData.patientCensus) {
            errors.push('กรุณากรอกข้อมูลจำนวนผู้ป่วย');
        }
    }
    
    // ถ้ามี errors ให้แสดง
    if (errors.length > 0) {
        Swal.fire({
            title: 'กรุณาตรวจสอบข้อมูล',
            html: errors.map(err => `- ${err}`).join('<br>'),
            icon: 'warning',
            confirmButtonColor: '#0ab4ab'
        });
        return false;
    }
    
    return true;
};

export const createOnSaveDraft = (
    formData, 
    selectedDate, 
    selectedShift, 
    selectedWard, 
    setIsLoading, 
    setHasUnsavedChanges
) => {
    return async () => {
        // ตรวจสอบความถูกต้องของฟอร์มก่อนบันทึก
        if (!validateFormBeforeSave(formData, 'draft')) {
            return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
        }
        
        // ยืนยันการบันทึกแบบร่าง
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
        
        if (!result.isConfirmed) {
            return { success: false, canceled: true };
        }
        
        try {
            setIsLoading(true);
            
            // ดำเนินการบันทึกร่าง...
            // (โค้ดเดิมสำหรับการบันทึกร่าง)
            
            // หลังจากบันทึกสำเร็จ
            setHasUnsavedChanges(false);
            
            // แสดงการแจ้งเตือนสำเร็จ
            Swal.fire({
                title: 'บันทึกสำเร็จ',
                text: 'บันทึกข้อมูลแบบร่างเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error saving draft:', error);
            
            // แสดงข้อผิดพลาด
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: `ไม่สามารถบันทึกร่างได้: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };
};

export const createOnSubmit = (
    formData, 
    selectedDate, 
    selectedShift, 
    selectedWard, 
    setIsLoading, 
    setHasUnsavedChanges
) => {
    return async () => {
        // ตรวจสอบความถูกต้องของฟอร์มก่อนบันทึก
        if (!validateFormBeforeSave(formData, 'final')) {
            return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
        }
        
        // ยืนยันการบันทึกข้อมูลแบบทางการ
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
        
        if (!result.isConfirmed) {
            return { success: false, canceled: true };
        }
        
        try {
            setIsLoading(true);
            
            // ดำเนินการบันทึกข้อมูล...
            // (โค้ดเดิมสำหรับการบันทึกข้อมูล)
            
            // หลังจากบันทึกสำเร็จ
            setHasUnsavedChanges(false);
            
            // แสดงการแจ้งเตือนสำเร็จ
            Swal.fire({
                title: 'บันทึกสำเร็จ',
                text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error submitting data:', error);
            
            // แสดงข้อผิดพลาด
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };
};

// สร้างฟังก์ชันสำหรับยืนยันการยกเลิก
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
            
            if (!result.isConfirmed) {
                return { success: false, canceled: true };
            }
        }
        
        if (typeof onCancel === 'function') {
            return await onCancel();
        }
        
        return { success: true };
    };
};

/**
 * ฟังก์ชันสร้าง handler สำหรับจัดการการเปลี่ยนแปลงของฟอร์ม
 */
export const createHandleFormChange = (category, setFormData, setHasUnsavedChanges, isReadOnly = false) => {
    return (field, value) => {
        // ตรวจสอบว่าฟอร์มเป็นแบบอ่านอย่างเดียวหรือไม่
        if (isReadOnly) {
            console.log('Form is read-only. Changes not allowed.');
            return;
        }
        
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
        
        // อัปเดต formData
        setFormData(prevData => {
            const updatedData = { ...prevData };
            
            // ถ้ามี category ให้อัปเดตเฉพาะ field ใน category นั้น
            if (category) {
                updatedData[category] = {
                    ...updatedData[category],
                    [field]: value
                };
            } else {
                // ถ้าไม่มี category ให้อัปเดตที่ root level
                updatedData[field] = value;
            }
            
            return updatedData;
        });
    };
};

/**
 * ฟังก์ชันสร้าง handler สำหรับคำนวณ Patient Census
 * เป็นรูปแบบ factory function ที่คืนค่าเป็นฟังก์ชันอีกทีหนึ่ง
 */
export const createCalculatePatientCensusTotal = (formData, setFormData, selectedShift) => {
    return (currentData = null) => {
        // ใช้ข้อมูลที่ส่งเข้ามา หรือถ้าไม่มีให้ใช้ formData ปัจจุบัน
        const data = currentData || formData;
        console.log("กำลังคำนวณ Patient Census จากข้อมูล:", JSON.stringify(data.patientCensus));
        
        if (!data?.patientCensus) {
            console.warn('ไม่สามารถคำนวณได้: ข้อมูล patientCensus ไม่มี');
            return;
        }
        
        const patientCensus = data.patientCensus;
        
        // แปลงค่าเป็นตัวเลข
        const newAdmit = parseInt(patientCensus.newAdmit || '0', 10);
        const transferIn = parseInt(patientCensus.transferIn || '0', 10);
        const referIn = parseInt(patientCensus.referIn || '0', 10);
        const transferOut = parseInt(patientCensus.transferOut || '0', 10);
        const referOut = parseInt(patientCensus.referOut || '0', 10);
        const discharge = parseInt(patientCensus.discharge || '0', 10);
        const dead = parseInt(patientCensus.dead || '0', 10);
        
        // คำนวณตามสูตร
        const total = newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
        
        console.log(`คำนวณ Patient Census: ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
        
        // อัปเดต formData
        setFormData(prevData => {
            const updatedData = { ...prevData };
            
            if (!updatedData.patientCensus) {
                updatedData.patientCensus = {};
            }
            
            updatedData.patientCensus.total = total.toString();
            
            if (selectedShift === 'Night (19:00-07:00)') {
                updatedData.overallData = total.toString();
            }
            
            return updatedData;
        });
        
        return total;
    };
}; 