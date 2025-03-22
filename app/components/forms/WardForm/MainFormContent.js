'use client';

/**
 * MainFormContent Component
 * 
 * แยกส่วน UI ของฟอร์มหลักออกมาจาก WardForm.js
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import FormDateShiftSelector from './FormDateShiftSelector';
import { WardFormSections } from './index';
import AlertUtil from '../../../utils/AlertUtil';
import { FaCalculator, FaInfoCircle, FaLock, FaUnlock, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';

// Import sections
import PatientCensusSection from './sections/PatientCensusSection';
import StaffSection from './sections/StaffSection';
import AdditionalInfoSection from './sections/AdditionalInfoSection';
import SignatureSection from './sections/SignatureSection';
import SummarySection from './sections/SummarySection';

// MainFormContent component - หากต้องการใช้ Tabs ให้ใช้แบบใหม่ที่ไม่ใช้ Chakra UI
const MainFormContent = ({ 
    selectedDate,
    selectedShift,
    selectedWard,
    formData,
    setFormData,
    handleLocalDateSelect,
    handleShiftChange,
    thaiDate,
    datesWithData,
    theme,
    approvalStatus,
    setApprovalStatus,
    setHasUnsavedChanges,
    hasUnsavedChanges,
    onSaveDraft,
    onSubmit,
    isSubmitting,
    isDraftMode,
    isReadOnly,
    isLoading,
    setIsLoading,
    setInitError,
    showCalendar,
    setShowCalendar,
    calculatePatientCensusTotal
}) => {
    // State for tabs
    const [activeTab, setActiveTab] = useState(0);
    
    // Determine if the form is locked (approved and final)
    const isFormLocked = useMemo(() => {
        return approvalStatus?.isApproved && formData?.status === 'final';
    }, [approvalStatus, formData]);
    
    // Function to handle input changes
    const handleInputChange = useCallback((e) => {
        if (isFormLocked) {
            AlertUtil.showAlert('ข้อมูลได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้', 'warning');
            return;
        }
        
        const { name, value } = e.target;
        
        // Update form data
        setFormData(prevData => {
            // Clone prevData to avoid direct mutations
            const newData = JSON.parse(JSON.stringify(prevData));
            
            // Handle nested fields (e.g., patientCensusSection.hospitalPatientCensus)
            if (name.includes('.')) {
                const parts = name.split('.');
                let target = newData;
                
                // Navigate through the object structure
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    // Create the object if it doesn't exist
                    if (!target[part]) target[part] = {};
                    target = target[part];
                }
                
                // Set the value at the final level
                target[parts[parts.length - 1]] = value;
            } else {
                // For top-level fields
                newData[name] = value;
            }
            
            // Calculate total if necessary
            if (name.startsWith('patientCensusSection.')) {
                calculatePatientCensusTotal(newData);
            }
            
            return newData;
        });
        
        setHasUnsavedChanges(true);
    }, [isFormLocked, setFormData, setHasUnsavedChanges, calculatePatientCensusTotal]);
    
    const renderFormStatusBadge = () => {
        if (approvalStatus?.isApproved) {
            return (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaCheckCircle className="mr-1" />
                    อนุมัติแล้ว
                </div>
            );
        } else if (formData?.status === 'final') {
            return (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <FaClock className="mr-1" />
                    รอการอนุมัติ
                </div>
            );
        } else if (formData?.id) {
            return (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <FaInfoCircle className="mr-1" />
                    บันทึกแบบร่าง
                </div>
            );
        }
        return null;
    };
    
    const renderCalculationStatus = () => {
        return (
            <div className="inline-flex items-center text-xs text-gray-500 ml-2">
                <FaCalculator className="mr-1" />
                <span>คำนวณอัตโนมัติ</span>
            </div>
        );
    };
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
        );
    }
    
    return (
        <div className={`p-4 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">แบบฟอร์มบันทึกข้อมูล</h2>
                {renderFormStatusBadge()}
            </div>
            
            <FormDateShiftSelector
                selectedDate={selectedDate}
                selectedShift={selectedShift}
                onDateSelect={handleLocalDateSelect}
                onShiftChange={handleShiftChange}
                thaiDate={thaiDate}
                datesWithData={datesWithData}
                showCalendar={showCalendar}
                setShowCalendar={setShowCalendar}
                isDarkMode={theme === 'dark'}
            />
            
            {formData?.autoFilledFrom && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-md mt-3 mb-3 text-sm">
                    <FaInfoCircle className="inline mr-1" />
                    ข้อมูลถูกเติมอัตโนมัติจาก {formData.autoFilledFrom}
                </div>
            )}
            
            {isFormLocked && (
                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md mt-3 mb-3 flex items-center">
                    <FaLock className="mr-2" />
                    <span>ข้อมูลนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้</span>
                </div>
            )}
            
            {/* Custom Tabs without Chakra UI */}
            <div className="mt-4">
                {/* Tab headers */}
                <div className="flex border-b border-gray-200">
                    <button
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab(0)}
                    >
                        ข้อมูลผู้ป่วย
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 1 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab(1)}
                    >
                        ข้อมูลบุคลากร
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 2 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab(2)}
                    >
                        ข้อมูลเพิ่มเติม
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 3 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab(3)}
                    >
                        ลงนาม
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 4 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab(4)}
                    >
                        สรุป
                    </button>
                </div>
                
                {/* Tab content */}
                <div className="p-4">
                    {activeTab === 0 && (
                        <PatientCensusSection 
                            formData={formData} 
                            handleInputChange={handleInputChange}
                            isReadOnly={isReadOnly || isFormLocked}
                            isDarkMode={theme === 'dark'}
                        />
                    )}
                    {activeTab === 1 && (
                        <StaffSection 
                            formData={formData} 
                            handleInputChange={handleInputChange}
                            isReadOnly={isReadOnly || isFormLocked}
                            isDarkMode={theme === 'dark'}
                        />
                    )}
                    {activeTab === 2 && (
                        <AdditionalInfoSection 
                            formData={formData} 
                            handleInputChange={handleInputChange}
                            isReadOnly={isReadOnly || isFormLocked}
                            isDarkMode={theme === 'dark'}
                        />
                    )}
                    {activeTab === 3 && (
                        <SignatureSection 
                            formData={formData} 
                            handleInputChange={handleInputChange}
                            isReadOnly={isReadOnly || isFormLocked}
                            isDarkMode={theme === 'dark'}
                        />
                    )}
                    {activeTab === 4 && (
                        <SummarySection 
                            formData={formData}
                            approvalStatus={approvalStatus}
                            isFormFinal={formData?.status === 'final'}
                            isDarkMode={theme === 'dark'}
                        />
                    )}
                </div>
            </div>
            
            {/* Form actions */}
            <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <div>
                    {!isFormLocked && (
                        <button
                            onClick={onSaveDraft}
                            disabled={isSubmitting}
                            className={`mr-3 px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                        </button>
                    )}
                </div>
                <div>
                    {!isFormLocked && (
                        <button
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainFormContent; 