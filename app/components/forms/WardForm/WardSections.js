'use client';

/**
 * WardSections Components
 * 
 * This file contains various components for WardForm:
 * - PatientCensusSection: For patient data display
 * - StaffingSection: For staff data display
 * - NotesSection: For additional information
 * - WardFormSections: Component that combines all sections
 * 
 * Improvements:
 * - Added Dark mode support for all form sections
 * - Added Nurse Manager and WC fields in StaffingSection
 * - Improved display for various screen sizes
 * - Added automatic calculation for Patient Census
 * - Formula used: (New Admit + Transfer In + Refer In) - (Transfer Out + Refer Out + Discharge + Dead)
 * - Calculation happens immediately when related fields change
 */

import React, { useEffect } from 'react';
import { calculatePatientCensus } from './DataFetchers';

// ส่วนรายละเอียดผู้ป่วย
export const PatientCensusSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  // ใช้ useEffect ในการคำนวณ Patient Census เมื่อข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    if (formData) {
      // คำนวณ Patient Census ทันทีที่มีการเปลี่ยนแปลงค่าในฟิลด์
      const newAdmit = parseInt(formData.newAdmit || '0');
      const transferIn = parseInt(formData.transferIn || '0');
      const referIn = parseInt(formData.referIn || '0');
      const transferOut = parseInt(formData.transferOut || '0');
      const referOut = parseInt(formData.referOut || '0');
      const discharge = parseInt(formData.discharge || '0');
      const dead = parseInt(formData.dead || '0');
      
      // คำนวณค่า Patient Census ใหม่
      const calculatedCensus = (newAdmit + transferIn + referIn) - (transferOut + referOut + discharge + dead);
      
      // อัพเดทค่า formData เฉพาะถ้ามีการเปลี่ยนแปลง
      if (calculatedCensus.toString() !== formData.patientCensus) {
        handleInputChange({ target: { name: 'patientCensus', value: calculatedCensus.toString() } });
      }
    }
  }, [
    formData?.newAdmit, 
    formData?.transferIn, 
    formData?.referIn, 
    formData?.transferOut, 
    formData?.referOut, 
    formData?.discharge, 
    formData?.dead,
    handleInputChange
  ]);

  const isDark = theme === 'dark';

  // ฟังก์ชันสำหรับจัดการเมื่อมีการป้อนข้อมูล
  const handleNumericInput = (e) => {
    const { name, value } = e.target;
    // อนุญาตเฉพาะตัวเลขเท่านั้น
    const numericValue = value.replace(/[^0-9]/g, '');
    handleInputChange({ target: { name, value: numericValue } });
  };

  return (
    <div className={`${isDark ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        Patient Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Census */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Patient Census
          </label>
          <input
            type="text"
            name="patientCensus"
            value={formData?.patientCensus || '0'}
            onChange={handleInputChange}
            disabled={true}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-gray-100 border-gray-300 text-gray-900'
            }`}
          />
        </div>
        
        {/* Overall Data */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Overall Data
          </label>
          <input
            type="text"
            name="overallData"
            value={formData?.overallData || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Available */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Available
          </label>
          <input
            type="text"
            name="availableBeds"
            value={formData?.availableBeds || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Unavailable */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Unavailable
          </label>
          <input
            type="text"
            name="unavailable"
            value={formData?.unavailable || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>

        {/* Planned Discharge */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Planned Discharge
          </label>
          <input
            type="text"
            name="plannedDischarge"
            value={formData?.plannedDischarge || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* New Admit */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            New Admit
          </label>
          <input
            type="text"
            name="newAdmit"
            value={formData?.newAdmit || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Transfer In */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Transfer In
          </label>
          <input
            type="text"
            name="transferIn"
            value={formData?.transferIn || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Refer In */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Refer In
          </label>
          <input
            type="text"
            name="referIn"
            value={formData?.referIn || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Transfer Out */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Transfer Out
          </label>
          <input
            type="text"
            name="transferOut"
            value={formData?.transferOut || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Refer Out */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Refer Out
          </label>
          <input
            type="text"
            name="referOut"
            value={formData?.referOut || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Discharge */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Discharge
          </label>
          <input
            type="text"
            name="discharge"
            value={formData?.discharge || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* Dead */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Dead
          </label>
          <input
            type="text"
            name="dead"
            value={formData?.dead || '0'}
            onChange={handleNumericInput}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

// ส่วนรายละเอียดบุคลากร
export const StaffingSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`${isDark ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        Staffing Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nurse Manager */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Nurse Manager
          </label>
          <input
            type="text"
            name="nurseManager"
            value={formData?.nurseManager || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* RN */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            RN
          </label>
          <input
            type="text"
            name="rns"
            value={formData?.rns || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* PN */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            PN
          </label>
          <input
            type="text"
            name="pns"
            value={formData?.pns || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* NA */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            NA
          </label>
          <input
            type="text"
            name="nas"
            value={formData?.nas || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
        
        {/* WC */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            WC
          </label>
          <input
            type="text"
            name="wcs"
            value={formData?.wcs || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

// ส่วนรายละเอียดอื่นๆ
export const NotesSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`${isDark ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        Additional Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {/* Comments */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Comment
          </label>
          <textarea
            name="notes"
            value={formData?.notes || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            rows="3"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'
            }`}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Create a simple wrapped component that puts all sections together
export const WardFormSections = ({ formData, handleInputChange, isReadOnly, theme }) => {
  return (
    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <PatientCensusSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
        isReadOnly={isReadOnly} 
        theme={theme} 
      />
      <StaffingSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
        isReadOnly={isReadOnly} 
        theme={theme} 
      />
      <NotesSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
        isReadOnly={isReadOnly} 
        theme={theme} 
      />
    </div>
  );
};