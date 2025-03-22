'use client';

import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

/**
 * คอมโพเนนต์ AdditionalInfoSection - แสดงข้อมูลเพิ่มเติม
 * @param {Object} props
 * @returns {JSX.Element}
 */
const AdditionalInfoSection = ({ formData, handleInputChange, isReadOnly, isDarkMode }) => {
    // Get additional info or default to empty object
    const additionalInfoSection = formData?.additionalInfoSection || {};
    
    // Dynamic styling based on dark mode
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
    const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
    const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
    const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    
    // Helper function to render tooltip
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
            <h3 className="text-lg font-medium mb-4">ข้อมูลเพิ่มเติม</h3>
            
            <div className="space-y-6">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                        ปัญหาที่พบ
                        {renderTooltip('ระบุปัญหาที่พบในการปฏิบัติงาน')}
                    </label>
                    <textarea
                        name="additionalInfoSection.issues"
                        value={additionalInfoSection.issues || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        rows={3}
                        placeholder="ระบุปัญหาที่พบในการปฏิบัติงาน..."
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    ></textarea>
                </div>
                
                <div>
                    <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                        การแก้ไขปัญหา
                        {renderTooltip('ระบุวิธีการแก้ไขปัญหาที่ได้ดำเนินการไปแล้ว')}
                    </label>
                    <textarea
                        name="additionalInfoSection.solutions"
                        value={additionalInfoSection.solutions || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        rows={3}
                        placeholder="ระบุการแก้ไขปัญหาที่ได้ดำเนินการ..."
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    ></textarea>
                </div>
                
                <div>
                    <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                        ข้อเสนอแนะ
                        {renderTooltip('ข้อเสนอแนะหรือความคิดเห็นเพิ่มเติม')}
                    </label>
                    <textarea
                        name="additionalInfoSection.suggestions"
                        value={additionalInfoSection.suggestions || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        rows={3}
                        placeholder="ระบุข้อเสนอแนะหรือความคิดเห็น..."
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    ></textarea>
                </div>
                
                <div>
                    <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                        หมายเหตุ
                        {renderTooltip('ข้อมูลเพิ่มเติมอื่นๆ ที่ต้องการระบุ')}
                    </label>
                    <textarea
                        name="additionalInfoSection.notes"
                        value={additionalInfoSection.notes || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        rows={3}
                        placeholder="ระบุข้อมูลเพิ่มเติมอื่นๆ..."
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    ></textarea>
                </div>
            </div>
        </div>
    );
};

export default AdditionalInfoSection; 