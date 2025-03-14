'use client';

/**
 * ไฟล์ index.js นี้เป็นจุดรวมการ export ฟังก์ชันต่างๆ จากโมดูลย่อยของ WardForm
 * การแก้ไขหรือเพิ่มเติมการ export ควรทำที่ไฟล์นี้เพื่อให้มั่นใจว่าทุกฟังก์ชันถูก export อย่างถูกต้อง
 */

// Import firebase helpers
import { handleFirebaseIndexError, navigateToCreateIndex, safeQuery } from '../../../utils/firebase-helpers';

// Data Fetchers - ฟังก์ชันสำหรับดึงข้อมูล
export * from './DataFetchers';

// Form Handlers - ฟังก์ชันจัดการฟอร์ม
export * from './FormHandlers';

// Event Handlers - ฟังก์ชันจัดการอีเวนต์
export * from './EventHandlers';

// UI Components - คอมโพเนนต์สำหรับ UI
export * from './ApprovalButtons';
export * from './WardSections';

// Re-export firebase helpers
export { handleFirebaseIndexError, navigateToCreateIndex, safeQuery };

// เพิ่มการ export ฟังก์ชันทั้งหมดโดยตรงเพื่อความแน่นอน
// IMPORTANT: นำเข้าฟังก์ชันจากโมดูลที่ถูกต้องและ re-export เพื่อให้แน่ใจว่าฟังก์ชันทั้งหมดพร้อมใช้งาน
import { 
    fetchDatesWithData,
    fetchPreviousShiftData,
    fetchApprovalData,
    checkApprovalStatus,
    fetchLatestRecord,
    fetchWardData,
    fetchWardHistory,
    checkPast30DaysRecords
} from './DataFetchers';

// สร้างเวอร์ชันที่ปลอดภัยมากขึ้นของ fetchWardData
export const safeFetchWardData = async (date, ward, shift) => {
    // ตรวจสอบค่าก่อนเรียกใช้ fetchWardData
    if (!date || !ward || typeof ward !== 'string' || ward.trim() === '' || !shift) {
        console.error('safeFetchWardData: Invalid parameters', { date, ward, shift });
        return null;
    }
    
    try {
        return await fetchWardData(date, ward, shift);
    } catch (error) {
        console.error('Error in safeFetchWardData:', error);
        return null;
    }
};

import {
    parseInputValue,
    calculateTotal,
    handleWardFormSubmit
} from './FormHandlers';

import {
    handleBeforeUnload,
    handleInputChange,
    handleShiftChange,
    handleDateSelect
} from './EventHandlers';

import {
    ApprovalDataButton,
    LatestRecordButton
} from './ApprovalButtons';

import {
    PatientCensusSection,
    PatientMovementSection,
    StaffSection,
    NotesSection
} from './WardSections';

// Re-export ฟังก์ชันทั้งหมดอีกครั้งแบบตัวต่อตัว
export {
    fetchDatesWithData,
    fetchPreviousShiftData,
    fetchApprovalData,
    checkApprovalStatus,
    fetchLatestRecord,
    fetchWardData,
    fetchWardHistory,
    parseInputValue,
    calculateTotal,
    handleWardFormSubmit,
    handleBeforeUnload,
    handleInputChange,
    handleShiftChange,
    handleDateSelect,
    ApprovalDataButton,
    LatestRecordButton,
    PatientCensusSection,
    PatientMovementSection,
    StaffSection,
    NotesSection,
    checkPast30DaysRecords
};