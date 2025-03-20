'use client';

/**
 * ไฟล์ index.js สำหรับ WardForm - เป็นไฟล์ที่รวม exports ต่างๆ
 */

// Import จากไฟล์ภายนอก
import { handleFirebaseIndexError, navigateToCreateIndex, safeQuery } from '../../../utils/firebase-helpers';
import { parseInputValue, calculateTotal } from '../../../utils/calculateTotal';

// Import จากไฟล์ภายใน
import { 
  fetchWardData, 
  fetchPreviousWardData, 
  formatDate, 
  calculatePatientCensus,
  fetchAndPrepareWardData
} from './DataFetchers';

import { 
  handleInputChange,
  calculatePatientCensusTotal,
  validateFormBeforeSave,
  createHandleCancel,
  createOnSaveDraft,
  createOnSubmit
} from './FormHandlers';

import { 
  handleDateSelect,
  handleShiftChange,
  handleBeforeUnload,
  createHandleDateChange,
  createHandleShiftChange,
  createHandleBeforeUnload,
  createHandleSaveDraft,
  createHandleSubmit
} from './EventHandlers';

// Import UI components - Import each component separately to avoid circular dependencies
import WardForm from './WardForm';
import { PatientCensusSection, StaffingSection, NotesSection } from './WardSections';
import WardFormSections from './WardSections';

// Export ทุกอย่างที่จำเป็นต้องใช้
export {
  // Utils
  handleFirebaseIndexError, navigateToCreateIndex, safeQuery,
  parseInputValue, calculateTotal,
  
  // DataFetchers
  fetchWardData, fetchPreviousWardData, formatDate, calculatePatientCensus, fetchAndPrepareWardData,
  
  // FormHandlers
  handleInputChange, calculatePatientCensusTotal, validateFormBeforeSave, 
  createHandleCancel, createOnSaveDraft, createOnSubmit,
  
  // EventHandlers
  handleDateSelect, handleShiftChange, handleBeforeUnload,
  createHandleDateChange, createHandleShiftChange, createHandleBeforeUnload,
  createHandleSaveDraft, createHandleSubmit,
  
  // UI Components
  PatientCensusSection, StaffingSection, NotesSection
};

// Utility functions
export const safeFetchWardData = async (date, ward, shift) => {
  if (!date || !ward || typeof ward !== 'string' || ward.trim() === '' || !shift) {
    console.error('Invalid parameters', { date, ward, shift });
    return null;
  }
  try {
    return await fetchWardData(date, ward, shift);
  } catch (error) {
    console.error('Error in safeFetchWardData:', error);
    return null;
  }
};

export const simpleInputChange = (e, setFormData, setHasUnsavedChanges) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  if (setHasUnsavedChanges) setHasUnsavedChanges(true);
};

export const simpleShiftChange = (shift, setSelectedShift) => {
  setSelectedShift(shift);
};

export const simpleDateSelect = (date, setSelectedDate, setThaiDate, formatThaiDate) => {
  setSelectedDate(date);
  if (setThaiDate && formatThaiDate) {
    setThaiDate(formatThaiDate(date));
  }
};

export const simpleBeforeUnload = (e, hasUnsavedChanges) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
};

export const simpleWardFormSubmit = (e, onSubmit) => {
  e.preventDefault();
  if (onSubmit) onSubmit();
};

// Components เพิ่มเติม
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

// Export WardFormSections as a named export
export { WardFormSections };

// default export คือ WardForm component
export default WardForm;