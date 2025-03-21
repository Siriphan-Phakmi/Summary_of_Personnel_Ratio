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

// คอมโพเนนต์ FormInputField สำหรับ input fields ทั่วไป
const FormInputField = ({ 
  category, 
  name, 
  value, 
  label, 
  handleChange, 
  isReadOnly, 
  className = "", 
  type = "text",
  placeholder = "" 
}) => {
  return (
    <div className="mb-2">
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700" htmlFor={name}>
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        id={name}
        data-field-id={name}
        data-category={category}
        data-label={label}
        value={value || ''}
        onChange={handleChange(category)}
        disabled={isReadOnly}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md text-center ${className}`}
      />
    </div>
  );
};

// ส่วนรายละเอียดผู้ป่วย
export const PatientCensusSection = ({ formData, handleInputChange, isReadOnly, theme, numericOnly = true }) => {
  // ใช้ ref เพื่อเก็บค่า previous formData และป้องกันการเกิด infinite loop
  const prevValuesRef = useRef({});
  const isInitialRender = useRef(true);
  
  // ฟังก์ชัน wrapper สำหรับแปลง event handler เป็นรูปแบบที่ handleInputChange ต้องการ
  const handleChange = (category) => (e) => {
    const { name, value } = e.target;
    
    // ตรวจสอบว่าฟิลด์นี้ควรรับเฉพาะตัวเลขหรือไม่
    const shouldBeNumericOnly = (category === 'patientCensusData' || 
                              (category === 'personnelData' && (name === 'nurseManager' || name === 'RN' || name === 'PN' || name === 'WC')));
    
    // ถ้าควรเป็นตัวเลขเท่านั้น และค่าที่ป้อนไม่ใช่ตัวเลข ให้ยกเลิกการทำงาน
    if (shouldBeNumericOnly && value !== '' && !/^\d*$/.test(value)) return;
    
    if (typeof handleInputChange === 'function') {
      // ส่งค่าที่กรองแล้วไปให้ handleInputChange
      if (shouldBeNumericOnly) {
        handleInputChange(category, name, value.replace(/[^0-9]/g, ''));
      } else {
        // ถ้าไม่ใช่ฟิลด์ตัวเลข ให้ส่งค่าตามปกติ
        handleInputChange(category, name, value);
      }
    }
  };

  // ใช้ useEffect ในการคำนวณ Patient Census เมื่อข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    // ข้ามการคำนวณในการ render ครั้งแรก
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // ข้อมูลปัจจุบันไปเก็บไว้ใน ref
      prevValuesRef.current = {
        hospitalPatientcensus: formData?.patientCensusData?.hospitalPatientcensus,
        newAdmit: formData?.patientCensusData?.newAdmit,
        transferIn: formData?.patientCensusData?.transferIn,
        referIn: formData?.patientCensusData?.referIn,
        transferOut: formData?.patientCensusData?.transferOut,
        referOut: formData?.patientCensusData?.referOut,
        discharge: formData?.patientCensusData?.discharge,
        dead: formData?.patientCensusData?.dead
      };
      return;
    }

    if (formData && formData.patientCensusData) {
      // คำนวณ Patient Census ทันทีที่มีการเปลี่ยนแปลงค่าในฟิลด์
      // ใช้ parseInt แทน Number เพื่อให้แน่ใจว่าแปลงค่าเป็นตัวเลขที่ถูกต้อง
      const hospitalPatientcensus = parseInt(formData.patientCensusData.hospitalPatientcensus || '0', 10) || 0;
      const newAdmit = parseInt(formData.patientCensusData.newAdmit || '0', 10) || 0;
      const transferIn = parseInt(formData.patientCensusData.transferIn || '0', 10) || 0;
      const referIn = parseInt(formData.patientCensusData.referIn || '0', 10) || 0;
      const transferOut = parseInt(formData.patientCensusData.transferOut || '0', 10) || 0;
      const referOut = parseInt(formData.patientCensusData.referOut || '0', 10) || 0;
      const discharge = parseInt(formData.patientCensusData.discharge || '0', 10) || 0;
      const dead = parseInt(formData.patientCensusData.dead || '0', 10) || 0;
      
      // Debug: แสดงค่าทุกตัวที่นำมาคำนวณ
      console.log('DEBUG - VALUES:', {
        hospitalPatientcensus,
        newAdmit,
        transferIn,
        referIn,
        transferOut,
        referOut,
        discharge,
        dead
      });
      
      // คำนวณค่า Patient Census ใหม่โดยรวม hospitalPatientcensus
      const calculatedCensus = hospitalPatientcensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
      const calculatedCensusStr = calculatedCensus.toString();
      
      console.log(`ค่าที่คำนวณได้: ${hospitalPatientcensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${calculatedCensus}`);
      
      // ตรวจสอบว่ามีการเปลี่ยนค่าจริงๆ หรือไม่
      const valuesChanged = 
        prevValuesRef.current.hospitalPatientcensus !== formData.patientCensusData.hospitalPatientcensus ||
        prevValuesRef.current.newAdmit !== formData.patientCensusData.newAdmit ||
        prevValuesRef.current.transferIn !== formData.patientCensusData.transferIn ||
        prevValuesRef.current.referIn !== formData.patientCensusData.referIn ||
        prevValuesRef.current.transferOut !== formData.patientCensusData.transferOut ||
        prevValuesRef.current.referOut !== formData.patientCensusData.referOut ||
        prevValuesRef.current.discharge !== formData.patientCensusData.discharge ||
        prevValuesRef.current.dead !== formData.patientCensusData.dead;
        
      // อัพเดทค่า formData เฉพาะถ้ามีการเปลี่ยนแปลงค่าที่ใช้คำนวณ
      if (valuesChanged) {
        // อัพเดทค่า total ในฟอร์ม
        if (typeof handleInputChange === 'function') {
          handleInputChange('patientCensusData', 'total', calculatedCensusStr);
          
          // ถ้าเป็นกะดึก ให้อัพเดทค่า overallData ด้วย
          const isNightShift = 
            formData.shift === 'night' || 
            formData.shift === 'Night' || 
            formData.shift === 'Night (19:00-07:00)' || 
            formData.shift === '19:00-07:00' ||
            /night/i.test(formData.shift);
            
          if (isNightShift) {
            handleInputChange('patientCensusData', 'overallData', calculatedCensusStr);
          }
        }
        
        // อัพเดทค่าใน ref
        prevValuesRef.current = {
          hospitalPatientcensus: formData.patientCensusData.hospitalPatientcensus,
          newAdmit: formData.patientCensusData.newAdmit,
          transferIn: formData.patientCensusData.transferIn,
          referIn: formData.patientCensusData.referIn,
          transferOut: formData.patientCensusData.transferOut,
          referOut: formData.patientCensusData.referOut,
          discharge: formData.patientCensusData.discharge,
          dead: formData.patientCensusData.dead
        };
      }
    }
  }, [
    formData?.patientCensusData?.hospitalPatientcensus,
    formData?.patientCensusData?.newAdmit, 
    formData?.patientCensusData?.transferIn, 
    formData?.patientCensusData?.referIn, 
    formData?.patientCensusData?.transferOut, 
    formData?.patientCensusData?.referOut, 
    formData?.patientCensusData?.discharge, 
    formData?.patientCensusData?.dead,
    formData?.shift // เพิ่ม shift เพื่อให้คำนวณใหม่เมื่อเปลี่ยนกะ
  ]); // ตัด handleInputChange ออกจาก dependencies เพื่อป้องกัน infinite loop

  const isDark = theme === 'dark';

  // ดึงข้อมูลจาก formData
  const patientCensusData = formData?.patientCensusData || {};
  const isNightShift = 
    formData?.shift === 'night' || 
    formData?.shift === 'Night' || 
    formData?.shift === 'Night (19:00-07:00)' || 
    formData?.shift === '19:00-07:00' ||
    /night/i.test(formData?.shift);
  
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
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Patient Census
            </label>
            <input
              type="text"
              name="total"
              value={patientCensusData.total || ''}
              disabled={true}
              className="w-full px-3 py-2 border rounded-md text-center bg-blue-50 border-blue-200 text-2xl font-bold text-center text-blue-800"
            />
          </div>
          
          {/* Overall Data */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Overall Data
            </label>
            <input
              type="text"
              name="overallData"
              value={isNightShift ? (patientCensusData.overallData || patientCensusData.total || '') : ''}
              disabled={true}
              className="w-full px-3 py-2 border rounded-md text-center bg-blue-50 border-blue-200 text-2xl font-bold text-center text-blue-800"
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
              <FormInputField
                category="personnelData"
                name="nurseManager"
                value={formData?.personnelData?.nurseManager}
                label="Nurse Manager"
                handleChange={handleChange}
                isReadOnly={isReadOnly}
                className="bg-green-50 border-green-200 text-xl font-bold text-center text-green-800"
              />
              
              {/* RN */}
              <FormInputField
                category="personnelData"
                name="RN"
                value={formData?.personnelData?.RN}
                label="RN"
                handleChange={handleChange}
                isReadOnly={isReadOnly}
                className="bg-green-50 border-green-200 text-xl font-bold text-center text-green-800"
              />
              
              {/* PN */}
              <FormInputField
                category="personnelData"
                name="PN"
                value={formData?.personnelData?.PN}
                label="PN"
                handleChange={handleChange}
                isReadOnly={isReadOnly}
                className="bg-green-50 border-green-200 text-xl font-bold text-center text-green-800"
              />
              
              {/* WC */}
              <FormInputField
                category="personnelData"
                name="WC"
                value={formData?.personnelData?.WC}
                label="WC"
                handleChange={handleChange}
                isReadOnly={isReadOnly}
                className="bg-green-50 border-green-200 text-xl font-bold text-center text-green-800"
              />
            </div>
          </div>

      <div className={sectionColors.divider}></div>

      {/* Patient Admission section */}
      <div className={`${sectionColors.admission} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-yellow-800">Patient Admission</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInputField
            category="patientCensusData"
            name="hospitalPatientcensus"
            value={formData?.patientCensusData?.hospitalPatientcensus}
            label="Hospital patient census"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-yellow-50 border-yellow-200 text-xl font-bold text-yellow-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="newAdmit"
            value={formData?.patientCensusData?.newAdmit}
            label="New Admit"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-yellow-50 border-yellow-200 text-xl font-bold text-yellow-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="transferIn"
            value={formData?.patientCensusData?.transferIn}
            label="Transfer In"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-yellow-50 border-yellow-200 text-xl font-bold text-yellow-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="referIn"
            value={formData?.patientCensusData?.referIn}
            label="Refer In"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-yellow-50 border-yellow-200 text-xl font-bold text-yellow-800"
          />
        </div>
      </div>
      
      <div className={sectionColors.divider}></div>

      {/* Patient Discharge section */}
      <div className={`${sectionColors.discharge} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-red-800">Patient Discharge</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormInputField
            category="patientCensusData"
            name="transferOut"
            value={formData?.patientCensusData?.transferOut}
            label="Transfer Out"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-red-50 border-red-200 text-xl font-bold text-red-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="referOut"
            value={formData?.patientCensusData?.referOut}
            label="Refer Out"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-red-50 border-red-200 text-xl font-bold text-red-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="discharge"
            value={formData?.patientCensusData?.discharge}
            label="Discharge"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-red-50 border-red-200 text-xl font-bold text-red-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="dead"
            value={formData?.patientCensusData?.dead}
            label="Dead"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-red-50 border-red-200 text-xl font-bold text-red-800"
          />
        </div>
      </div>
      
      <div className={sectionColors.divider}></div>

      {/* Bed Management section */}
      <div className={`${sectionColors.beds} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-purple-800">Bed Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInputField
            category="patientCensusData"
            name="availableBeds"
            value={formData?.patientCensusData?.availableBeds}
            label="Available"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-purple-50 border-purple-200 text-xl font-bold text-purple-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="unavailable"
            value={formData?.patientCensusData?.unavailable}
            label="Unavailable"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-purple-50 border-purple-200 text-xl font-bold text-purple-800"
          />
          
          <FormInputField
            category="patientCensusData"
            name="plannedDischarge"
            value={formData?.patientCensusData?.plannedDischarge}
            label="Planned Discharge"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-purple-50 border-purple-200 text-xl font-bold text-purple-800"
          />
        </div>
      </div>

      <div className={sectionColors.divider}></div>

      {/* Comments section */}
      <div className={`${sectionColors.notes} rounded-lg p-4 mb-4`}>
        <h3 className="text-lg font-bold mb-2 text-pink-800">Comments</h3>
        <div className="w-full">
          <textarea
            name="comment"
            value={formData?.notes?.comment || ''}
            onChange={handleChange('notes')}
            disabled={isReadOnly}
            className="w-full px-4 py-3 bg-pink-50 border border-pink-200 rounded-md text-pink-800"
            rows="4"
            placeholder="Enter any additional notes or comments here."
          ></textarea>
        </div>
      </div>

      <div className={sectionColors.divider}></div>

      {/* Recorder Information section */}
      <div className="bg-teal-100 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-bold mb-2 text-teal-800">Recorder Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInputField
            category="personnelData"
            name="firstName"
            value={formData?.personnelData?.firstName}
            label="First Name"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-teal-50 border-teal-200 text-teal-800"
            placeholder="ชื่อผู้บันทึก"
          />
          
          <FormInputField
            category="personnelData"
            name="lastName"
            value={formData?.personnelData?.lastName}
            label="Last Name"
            handleChange={handleChange}
            isReadOnly={isReadOnly}
            className="bg-teal-50 border-teal-200 text-teal-800"
            placeholder="นามสกุลผู้บันทึก"
          />
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
  // ไม่ใช้แล้วเนื่องจากมี Comments section ในส่วนของ PatientCensusSection แล้ว
  return null;
};

// Create a simple wrapped component that puts all sections together
export const WardFormSections = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`${isDark ? 'text-white' : 'text-gray-800'} space-y-6`}>
      {/* Main Form Container */}
      <div className={`rounded-lg overflow-hidden shadow-md border ${isDark ? 'border-indigo-900 bg-gray-800' : 'border-blue-100 bg-blue-50'}`}>
        <div className={`px-5 py-3 ${isDark ? 'bg-indigo-900' : 'bg-blue-100'} border-b ${isDark ? 'border-indigo-800' : 'border-blue-200'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'} flex items-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Patient and Staff Information
          </h3>
        </div>
        <div className="p-4">
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

export default WardFormSections;