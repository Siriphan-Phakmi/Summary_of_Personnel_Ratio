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

  // ฟังก์ชันสำหรับจัดการเมื่อมีการป้อนข้อมูล
  const handleNumericInput = (e) => {
    const { name, value } = e.target;
    // อนุญาตเฉพาะตัวเลขเท่านั้น
    const numericValue = value.replace(/[^0-9]/g, '');
    handleInputChange({ target: { name, value: numericValue } });
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
              name="patientCensus"
              value={formData?.patientCensus || '0'}
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
              defaultValue={formData?.overallData || '0'}
              disabled={isReadOnly}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-2xl font-bold text-center text-blue-800"
            />
          </div>
        </div>
      </div>

      <div className={sectionColors.divider}></div>

      {/* Section 2: Staff Details */}
      <div className={`${sectionColors.staff} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-green-800">
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
              value={formData?.nurseManager || '0'}
              onChange={handleNumericInput}
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
              name="rns"
              value={formData?.rns || '0'}
              onChange={handleNumericInput}
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
              name="pns"
              value={formData?.pns || '0'}
              onChange={handleNumericInput}
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
              name="wcs"
              value={formData?.wcs || '0'}
              onChange={handleNumericInput}
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
              value={formData?.newAdmit || '0'}
              onChange={handleNumericInput}
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
              value={formData?.transferIn || '0'}
              onChange={handleNumericInput}
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
              value={formData?.referIn || '0'}
              onChange={handleNumericInput}
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Transfer Out */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-red-700">
              Transfer Out
            </label>
            <input
              type="text"
              name="transferOut"
              value={formData?.transferOut || '0'}
              onChange={handleNumericInput}
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
              value={formData?.referOut || '0'}
              onChange={handleNumericInput}
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
              value={formData?.discharge || '0'}
              onChange={handleNumericInput}
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
              value={formData?.dead || '0'}
              onChange={handleNumericInput}
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
              name="availableBeds"
              value={formData?.availableBeds || '0'}
              onChange={handleNumericInput}
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
              value={formData?.unavailable || '0'}
              onChange={handleNumericInput}
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
              value={formData?.plannedDischarge || '0'}
              onChange={handleNumericInput}
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
              value={formData?.notes || ''}
              onChange={handleNumericInput}
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
              name="recorderFirstName"
              defaultValue={formData?.recorderFirstName || ''}
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
              name="recorderLastName"
              defaultValue={formData?.recorderLastName || ''}
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

// ส่วนรายละเอียดบุคลากร - ส่วนนี้ไม่ใช้แล้ว เพราะรวมไปที่ PatientCensusSection แล้ว
export const StaffingSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  return null;
};

// ส่วนรายละเอียดอื่นๆ - ส่วนนี้ไม่ใช้แล้ว เพราะรวมไปที่ PatientCensusSection แล้ว
export const NotesSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  return null;
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
    </div>
  );
};