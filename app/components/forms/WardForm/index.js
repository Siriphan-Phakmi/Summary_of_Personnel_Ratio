'use client';

/**
 * ไฟล์ index.js นี้เป็นจุดรวมการ export ฟังก์ชันต่างๆ จากโมดูลย่อยของ WardForm
 * การแก้ไขหรือเพิ่มเติมการ export ควรทำที่ไฟล์นี้เพื่อให้มั่นใจว่าทุกฟังก์ชันถูก export อย่างถูกต้อง
 */

// Import firebase helpers
import { handleFirebaseIndexError, navigateToCreateIndex, safeQuery } from '../../../utils/firebase-helpers';
import { fetchWardData } from './DataFetchers';
import { parseInputValue, calculateTotal } from '../../../utils/calculateTotal';

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

// Re-export calculate functions
export { parseInputValue, calculateTotal };

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

export const handleInputChange = (e, setFormData, setHasUnsavedChanges) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
};

export const handleShiftChange = (shift, setSelectedShift) => {
    setSelectedShift(shift);
};

export const handleDateSelect = (date, setSelectedDate, setThaiDate, formatThaiDate) => {
    setSelectedDate(date);
    if (setThaiDate && formatThaiDate) {
        setThaiDate(formatThaiDate(date));
    }
};

export const handleBeforeUnload = (e, hasUnsavedChanges) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
};

export const handleWardFormSubmit = (e, onSubmit) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
};

// Placeholder components for future implementation
export const ApprovalDataButton = ({ onClick, label = "View Approval Data" }) => {
    return (
        <button 
            onClick={onClick} 
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
        >
            {label}
        </button>
    );
};

export const LatestRecordButton = ({ onClick, label = "View Latest Record" }) => {
    return (
        <button 
            onClick={onClick} 
            className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
        >
            {label}
        </button>
    );
};

export { default } from './WardForm';