'use client';

import React, { useState, useEffect } from 'react';
import { calculatePatientCensus } from './DataFetchers';

// ส่วนรายละเอียดผู้ป่วย
export const PatientCensusSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  // ใช้ useEffect ในการคำนวณ Patient Census เมื่อข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    if (formData) {
      // ตรวจสอบว่ามีการกรอกข้อมูลในช่องใดช่องหนึ่งหรือไม่
      const hasInput = formData.newAdmit || formData.transferIn || formData.referIn || 
                        formData.transferOut || formData.referOut || formData.discharge || formData.dead;
      
      if (hasInput) {
        // คำนวณค่า Patient Census
        const census = calculatePatientCensus(formData);
        
        // อัพเดทค่า formData เฉพาะถ้ามีการเปลี่ยนแปลง
        if (census !== formData.patientCensus) {
          handleInputChange({ target: { name: 'patientCensus', value: census } });
        }
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
  ]);

  const isDark = theme === 'dark';

  return (
    <div className={`${isDark ? 'bg-gray-800 shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        รายละเอียดผู้ป่วย
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
            value={formData?.patientCensus || ''}
            onChange={handleInputChange}
            disabled={true}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-gray-100 border-gray-300 text-gray-900'
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
            value={formData?.newAdmit || ''}
            onChange={handleInputChange}
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
            value={formData?.transferIn || ''}
            onChange={handleInputChange}
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
            value={formData?.referIn || ''}
            onChange={handleInputChange}
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
            value={formData?.transferOut || ''}
            onChange={handleInputChange}
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
            value={formData?.referOut || ''}
            onChange={handleInputChange}
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
            value={formData?.discharge || ''}
            onChange={handleInputChange}
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
            value={formData?.dead || ''}
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

// ส่วนรายละเอียดบุคลากร
export const StaffingSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`${isDark ? 'bg-gray-800 shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        จำนวนบุคลากร
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
};

// ส่วนรายละเอียดอื่นๆ
export const NotesSection = ({ formData, handleInputChange, isReadOnly, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`${isDark ? 'bg-gray-800 shadow-md' : 'bg-white shadow-sm'} rounded-lg mb-4 p-4`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        ข้อมูลเพิ่มเติม
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Comments */}
        <div className="mb-4 md:col-span-3">
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