'use client';

import React from 'react';
import { FaInfoCircle, FaCalculator } from 'react-icons/fa';

/**
 * คอมโพเนนต์ PatientCensusSection - แสดงส่วนข้อมูลผู้ป่วยและการคำนวณอัตโนมัติ
 * @param {Object} props
 * @returns {JSX.Element}
 */
const PatientCensusSection = ({ formData, handleInputChange, isReadOnly, isDarkMode }) => {
    // Get the current values or default to empty strings
    const patientCensusSection = formData?.patientCensusSection || {};
    const hospitalPatientCensus = patientCensusSection.hospitalPatientCensus || '';
    const newAdmit = patientCensusSection.newAdmit || '';
    const transferIn = patientCensusSection.transferIn || '';
    const referIn = patientCensusSection.referIn || '';
    const transferOut = patientCensusSection.transferOut || '';
    const referOut = patientCensusSection.referOut || '';
    const discharge = patientCensusSection.discharge || '';
    const dead = patientCensusSection.dead || '';
    const total = patientCensusSection.total || '';
    
    // Determine if it's night shift for different calculation method
    const isNightShift = formData?.shift === 'night';
    
    // Dynamic styling based on dark mode
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
    const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
    const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
    const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const calculatedBgColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';
    
    const renderTooltip = (text) => (
        <div className="group relative inline-block">
            <FaInfoCircle className={`inline-block ml-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} cursor-help`} />
            <div className="absolute z-10 w-48 p-2 mt-1 text-sm rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 left-full transform -translate-x-1/2 bottom-full mb-1
                 shadow-lg bg-gray-900 text-white">
                {text}
            </div>
        </div>
    );
    
    return (
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${bgColor} ${textColor}`}>
            <h3 className="text-lg font-medium mb-4">ข้อมูลผู้ป่วย</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* First column */}
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Patient Census
                            {renderTooltip('จำนวนผู้ป่วยทั้งหมดในหอผู้ป่วย ณ เวลาที่เริ่มเวร')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.hospitalPatientCensus"
                            value={hospitalPatientCensus}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Admit
                            {renderTooltip('จำนวนผู้ป่วยที่รับใหม่ในเวร')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.newAdmit"
                            value={newAdmit}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Transfer In
                            {renderTooltip('จำนวนผู้ป่วยที่ย้ายเข้ามาในหอผู้ป่วย')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.transferIn"
                            value={transferIn}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Refer In
                            {renderTooltip('จำนวนผู้ป่วยที่ส่งมาจากโรงพยาบาลอื่น')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.referIn"
                            value={referIn}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                </div>
                
                {/* Second column */}
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Transfer Out
                            {renderTooltip('จำนวนผู้ป่วยที่ย้ายออกจากหอผู้ป่วย')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.transferOut"
                            value={transferOut}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Refer Out
                            {renderTooltip('จำนวนผู้ป่วยที่ส่งไปโรงพยาบาลอื่น')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.referOut"
                            value={referOut}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Discharge
                            {renderTooltip('จำนวนผู้ป่วยที่จำหน่ายกลับบ้าน')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.discharge"
                            value={discharge}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            Dead
                            {renderTooltip('จำนวนผู้ป่วยที่เสียชีวิต')}
                        </label>
                        <input
                            type="number"
                            name="patientCensusSection.dead"
                            value={dead}
                            onChange={handleInputChange}
                            readOnly={isReadOnly}
                            min="0"
                            className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                    </div>
                </div>
            </div>
            
            {/* Total row */}
            <div className="mt-6 p-3 rounded-md border border-dashed border-gray-400 bg-opacity-50 relative">
                <div className="flex items-center justify-between mb-2">
                    <label className={`block text-sm font-medium ${labelColor}`}>
                        Total Patient Census
                        {renderTooltip(isNightShift 
                            ? 'คำนวณจาก: Patient Census + Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead' 
                            : 'คำนวณจาก: Patient Census + Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead')}
                    </label>
                    <div className="inline-flex items-center text-xs text-green-600">
                        <FaCalculator className="mr-1" />
                        <span>คำนวณอัตโนมัติ</span>
                    </div>
                </div>
                <input
                    type="text"
                    value={total}
                    readOnly
                    className={`w-full p-2 rounded-md ${calculatedBgColor} ${textColor} cursor-not-allowed`}
                />
                
                <div className="mt-3 text-xs text-gray-500">
                    <p>การคำนวณ:</p>
                    <p className="mt-1">
                        Patient Census ({hospitalPatientCensus || '0'}) + 
                        Admit ({newAdmit || '0'}) + 
                        Transfer In ({transferIn || '0'}) + 
                        Refer In ({referIn || '0'}) - 
                        Transfer Out ({transferOut || '0'}) - 
                        Refer Out ({referOut || '0'}) - 
                        Discharge ({discharge || '0'}) - 
                        Dead ({dead || '0'}) = {total || '0'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PatientCensusSection; 