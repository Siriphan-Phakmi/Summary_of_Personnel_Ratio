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

import React, { useEffect, useRef } from 'react';
import { calculatePatientCensus } from './DataFetchers';

// ส่วนรายละเอียดผู้ป่วย
export const PatientCensusSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  // ใช้ ref เพื่อเก็บค่า previous formData และป้องกันการเกิด infinite loop
  const prevValuesRef = useRef({});
  const isInitialRender = useRef(true);

  // ใช้ useEffect ในการคำนวณ Patient Census เมื่อข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    // ข้ามการคำนวณในการ render ครั้งแรก
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // ข้อมูลปัจจุบันไปเก็บไว้ใน ref
      prevValuesRef.current = {
        newAdmit: formData?.newAdmit,
        transferIn: formData?.transferIn,
        referIn: formData?.referIn,
        transferOut: formData?.transferOut,
        referOut: formData?.referOut,
        discharge: formData?.discharge,
        dead: formData?.dead,
        patientCensus: formData?.patientCensus
      };
      return;
    }

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
      const calculatedCensusStr = calculatedCensus.toString();
      
      // ตรวจสอบว่ามีการเปลี่ยนค่าจริงๆ หรือไม่ และค่าที่คำนวณได้แตกต่างจากค่าปัจจุบัน
      const valuesChanged = 
        prevValuesRef.current.newAdmit !== formData.newAdmit ||
        prevValuesRef.current.transferIn !== formData.transferIn ||
        prevValuesRef.current.referIn !== formData.referIn ||
        prevValuesRef.current.transferOut !== formData.transferOut ||
        prevValuesRef.current.referOut !== formData.referOut ||
        prevValuesRef.current.discharge !== formData.discharge ||
        prevValuesRef.current.dead !== formData.dead;
        
      // อัพเดทค่า formData เฉพาะถ้ามีการเปลี่ยนแปลงค่าที่ใช้คำนวณ และผลลัพธ์ไม่ตรงกับค่าปัจจุบัน
      if (valuesChanged && calculatedCensusStr !== formData.patientCensus) {
        // สร้าง event object แบบง่ายๆ เพื่อเรียกใช้ handleInputChange
        const event = { target: { name: 'patientCensus', value: calculatedCensusStr } };
        handleInputChange(event);
        
        // อัพเดทค่าใน ref
        prevValuesRef.current = {
          newAdmit: formData.newAdmit,
          transferIn: formData.transferIn,
          referIn: formData.referIn,
          transferOut: formData.transferOut,
          referOut: formData.referOut,
          discharge: formData.discharge,
          dead: formData.dead,
          patientCensus: calculatedCensusStr
        };
      }
    }
  }, [
    formData?.newAdmit, 
    formData?.transferIn, 
    formData?.referIn, 
    formData?.transferOut, 
    formData?.referOut, 
    formData?.discharge, 
    formData?.dead
  ]); // ตัด handleInputChange ออกจาก dependencies เพื่อป้องกัน infinite loop

  const isDark = theme === 'dark';

  // ฟังก์ชันสำหรับจัดการอินพุตที่เป็นตัวเลขเท่านั้น
  const handleNumericInput = (e, section) => {
    const { name, value } = e.target;
    
    // อนุญาตเฉพาะตัวเลขเท่านั้น
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (section === 'patientCensus') {
        // ส่งข้อมูลไปยัง handleInputChange สำหรับ patientCensus
        handleInputChange('patientCensus', name, numericValue);
        
        // รีคำนวณ total หลังจากการอัปเดต (อาจต้องรอให้ state อัปเดตก่อน)
        setTimeout(() => {
            if (typeof handleInputChange === 'function') {
                handleInputChange('', 'recalculateTotal', true);
            }
        }, 100);
    } else if (section === 'bedManagement') {
        // ส่งข้อมูลไปยัง handleInputChange สำหรับ bedManagement
        handleInputChange('bedManagement', name, numericValue);
    }
  };

  // สีพื้นหลัง Pastel สำหรับแต่ละส่วน
  const sectionColors = {
    census: 'bg-blue-100',
    staff: 'bg-green-100',
    admission: 'bg-yellow-100',
    discharge: 'bg-red-100',
    beds: 'bg-purple-100',
    notes: 'bg-pink-100',
    divider: 'border-b border-gray-200 my-3'
  };

  return (
    <div className={`${isDark ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      {/* Section 1: Patient Census and Overall Data */}
      <div className={`${sectionColors.census} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-blue-800">
          Patient Census & Overall Data
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Census */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-blue-700">
              Patient Census
            </label>
            <input
              type="text"
              name="total"
              value={formData?.patientCensus?.total || '0'}
              readOnly
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-2xl font-bold text-center text-blue-800"
            />
          </div>
          
          {/* Overall Data */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-blue-700">
              Overall Data
            </label>
            <input
              type="text"
              name="overallData"
              value={formData?.overallData || '0'}
              onChange={(e) => handleInputChange('', 'overallData', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-2xl font-bold text-center text-blue-800"
            />
          </div>
        </div>
        <div className={sectionColors.divider}></div>
        
      </div>
          {/* Staff Details embedded inside Patient Census section */}
          <div className={`mt-4 ${isDark ? 'bg-gray-800 text-white shadow-md' : 'bg-green-50 shadow-sm'} rounded-lg p-4`}>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-green-300' : 'text-green-700'} flex items-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Staff Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Nurse Manager */}
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1 text-green-700">
                  Nurse Manager
                </label>
                <input
                  type="text"
                  name="nurseManager"
                  value={formData?.staffing?.nurseManager || '0'}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('staffing', 'nurseManager', numericValue);
                  }}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xl font-bold text-center text-green-800"
                />
              </div>
              
              {/* RN */}
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1 text-green-700">
                  RN
                </label>
                <input
                  type="text"
                  name="rn"
                  value={formData?.staffing?.rn || '0'}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('staffing', 'rn', numericValue);
                  }}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xl font-bold text-center text-green-800"
                />
              </div>
              
              {/* PN */}
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1 text-green-700">
                  PN
                </label>
                <input
                  type="text"
                  name="lpn"
                  value={formData?.staffing?.lpn || '0'}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('staffing', 'lpn', numericValue);
                  }}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xl font-bold text-center text-green-800"
                />
              </div>
              
              {/* WC */}
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1 text-green-700">
                  WC
                </label>
                <input
                  type="text"
                  name="wc"
                  value={formData?.staffing?.wc || '0'}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('staffing', 'wc', numericValue);
                  }}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xl font-bold text-center text-green-800"
                />
              </div>
            </div>
          </div>

      <div className={sectionColors.divider}></div>

      {/* Section 3: Patient Admission */}
      <div className={`${sectionColors.admission} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-yellow-800">
          Patient Admission
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* New Admit */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-yellow-700">
              New Admit
            </label>
            <input
              type="text"
              name="newAdmit"
              value={formData?.patientCensus?.newAdmit || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-xl font-bold text-center text-yellow-800"
            />
          </div>
          
          {/* Transfer In */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-yellow-700">
              Transfer In
            </label>
            <input
              type="text"
              name="transferIn"
              value={formData?.patientCensus?.transferIn || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-xl font-bold text-center text-yellow-800"
            />
          </div>
          
          {/* Refer In */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-yellow-700">
              Refer In
            </label>
            <input
              type="text"
              name="referIn"
              value={formData?.patientCensus?.referIn || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-xl font-bold text-center text-yellow-800"
            />
          </div>
        </div>
      </div>
      
      <div className={sectionColors.divider}></div>

      {/* Section 4: Patient Discharge */}
      <div className={`${sectionColors.discharge} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-red-800">
          Patient Discharge
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Transfer Out */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-red-700">
              Transfer Out
            </label>
            <input
              type="text"
              name="transferOut"
              value={formData?.patientCensus?.transferOut || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xl font-bold text-center text-red-800"
            />
          </div>
          
          {/* Refer Out */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-red-700">
              Refer Out
            </label>
            <input
              type="text"
              name="referOut"
              value={formData?.patientCensus?.referOut || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xl font-bold text-center text-red-800"
            />
          </div>
          
          {/* Discharge */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-red-700">
              Discharge
            </label>
            <input
              type="text"
              name="discharge"
              value={formData?.patientCensus?.discharge || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xl font-bold text-center text-red-800"
            />
          </div>
          
          {/* Dead */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-red-700">
              Dead
            </label>
            <input
              type="text"
              name="dead"
              value={formData?.patientCensus?.dead || '0'}
              onChange={(e) => handleNumericInput(e, 'patientCensus')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xl font-bold text-center text-red-800"
            />
          </div>
        </div>
      </div>
      
      <div className={sectionColors.divider}></div>

      {/* Section 5: Bed Management */}
      <div className={`${sectionColors.beds} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-purple-800">
          Bed Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Available Beds */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-purple-700">
              Available
            </label>
            <input
              type="text"
              name="available"
              value={formData?.bedManagement?.available || '0'}
              onChange={(e) => handleNumericInput(e, 'bedManagement')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-md text-xl font-bold text-center text-purple-800"
            />
          </div>
          
          {/* Unavailable */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-purple-700">
              Unavailable
            </label>
            <input
              type="text"
              name="unavailable"
              value={formData?.bedManagement?.unavailable || '0'}
              onChange={(e) => handleNumericInput(e, 'bedManagement')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-md text-xl font-bold text-center text-purple-800"
            />
          </div>
          
          {/* Planned Discharge */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-purple-700">
              Planned Discharge
            </label>
            <input
              type="text"
              name="plannedDischarge"
              value={formData?.bedManagement?.plannedDischarge || '0'}
              onChange={(e) => handleNumericInput(e, 'bedManagement')}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-md text-xl font-bold text-center text-purple-800"
            />
          </div>
        </div>
      </div>

      <div className={sectionColors.divider}></div>

      {/* Section 6: Comments */}
      <div className={`${sectionColors.notes} rounded-lg p-4 mb-2`}>
        <h3 className="text-lg font-bold mb-2 text-pink-800">
          Comments
        </h3>
        
        <div>
          {/* Comments */}
          <div className="mb-2">
            <textarea
              name="notes"
              value={formData?.staffing?.notes || ''}
              onChange={(e) => handleInputChange('staffing', 'notes', e.target.value)}
              disabled={isReadOnly}
              rows="3"
              placeholder="Enter any additional notes or comments here..."
              className="w-full px-3 py-2 bg-pink-50 border border-pink-200 rounded-md text-pink-800"
            ></textarea>
          </div>
        </div>
      </div>

      <div className={sectionColors.divider}></div>

      {/* Section 7: Recorder Information */}
      <div className="bg-teal-100 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-bold mb-2 text-teal-800">
          Recorder Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Firstname */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-teal-700">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData?.staffing?.firstName || ''}
              onChange={(e) => handleInputChange('staffing', 'firstName', e.target.value)}
              disabled={isReadOnly}
              placeholder="ชื่อผู้บันทึก"
              className="w-full px-3 py-2 bg-teal-50 border border-teal-200 rounded-md text-teal-800"
            />
          </div>
          
          {/* Lastname */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-teal-700">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData?.staffing?.lastName || ''}
              onChange={(e) => handleInputChange('staffing', 'lastName', e.target.value)}
              disabled={isReadOnly}
              placeholder="นามสกุลผู้บันทึก"
              className="w-full px-3 py-2 bg-teal-50 border border-teal-200 rounded-md text-teal-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ส่วนรายละเอียดบุคลากร
export const StaffingSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  // No longer needed since we embedded the Staff Details inside PatientCensusSection
  return null;
};

// ส่วนรายละเอียดอื่นๆ
export const NotesSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';

  // ฟังก์ชันสำหรับจัดการเมื่อมีการป้อนข้อความ
  const handleTextInput = (e) => {
    const { name, value } = e.target;
    handleInputChange('staffing', name, value);
  };

  return (
    <div className={`${isDark ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-pink-700">
          Comments
        </label>
        <textarea
          name="notes"
          value={formData?.staffing?.notes || ''}
          onChange={handleTextInput}
          disabled={isReadOnly}
          rows="4"
          className="w-full px-3 py-2 bg-pink-50 border border-pink-200 rounded-md text-gray-800"
          placeholder="Enter any additional notes or comments here..."
        ></textarea>
      </div>
    </div>
  );
};

// Create a simple wrapped component that puts all sections together
export const WardFormSections = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`${isDark ? 'text-white' : 'text-gray-800'} space-y-8`}>
      {/* Patient Census Section */}
      <div className={`rounded-lg overflow-hidden shadow-md border ${isDark ? 'border-indigo-900 bg-gray-800' : 'border-blue-100 bg-blue-50'}`}>
        <div className={`px-5 py-4 ${isDark ? 'bg-indigo-900' : 'bg-blue-100'} border-b ${isDark ? 'border-indigo-800' : 'border-blue-200'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'} flex items-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Patient Census & Overall Data
          </h3>
        </div>
        <div className="p-5">
          <PatientCensusSection 
            formData={formData} 
            handleInputChange={handleInputChange} 
            isReadOnly={isReadOnly} 
            theme={theme} 
          />
          

        </div>
      </div>
    </div>
  );
};