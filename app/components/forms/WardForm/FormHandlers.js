'use client';
import { collection, addDoc, updateDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';

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