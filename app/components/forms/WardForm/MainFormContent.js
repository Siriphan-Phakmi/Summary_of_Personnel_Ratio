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

// MainFormContent component
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
    const { user } = useAuth();
    const { theme: themeContext } = useTheme();
    const isDark = theme === 'dark';
    
    const [localLoading, setLocalLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
        confirmText: 'ตกลง',
        cancelText: null
    });

    // Add timeout for loading state
    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            // ป้องกันกรณี isLoading เป็น undefined
            if (isLoading === true) {
                setInitError('การโหลดข้อมูลใช้เวลานานเกินไป โปรดลองใหม่อีกครั้ง');
                setIsLoading(false);
            }
        }, 15000); // 15 seconds timeout
        
        return () => clearTimeout(loadingTimeout);
    }, [isLoading, setInitError, setIsLoading]);

    // กำหนดสีพื้นหลังของฟอร์มตาม theme
    const formBgClass = isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200';
    const sectionBgClass = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const buttonBgClass = isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0ab4ab] hover:bg-[#099b93]';
    const inputBgClass = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';
    const labelClass = isDark ? 'text-gray-300' : 'text-gray-600';

    // จัดการการเปลี่ยนแปลงของฟอร์ม
    const handleFormChange = (category, field, value) => {
        if (isReadOnly) return;
        
        console.log(`handleFormChange: ${category}.${field} = ${value}`);
        
        // ตรวจสอบว่า category และ field ไม่เป็น undefined หรือ null
        if (!category || !field) {
            console.warn('Invalid input: category or field is undefined or null', { category, field, value });
            return;
        }
        
        // ป้องกันการเรียกซ้ำที่อาจเกิดจาก input ที่เปลี่ยนแปลงพร้อมกัน
        setHasUnsavedChanges(true);
        
        // ตรวจสอบว่าฟิลด์นี้ควรแปลงเป็นตัวเลขหรือไม่
        const shouldParseNumeric = category === 'patientCensusData' || 
            (category === 'personnelData' && (field === 'nurseManager' || field === 'RN' || field === 'PN' || field === 'WC'));
            
        // แปลงค่าเป็นตัวเลขเฉพาะสำหรับฟิลด์ที่ควรเป็นตัวเลข
        const parsedValue = shouldParseNumeric ? (value === '' ? '' : Number(value)) : value;
        
        // สำหรับการกรอกข้อมูลผู้ป่วย
        if (category === 'patientCensusData') {
            setFormData(prevState => {
                // สร้าง copy ของ state เดิม
                const newState = { ...prevState };
                
                // อัพเดทค่าใน field ที่ระบุ
                if (!newState[category]) newState[category] = {};
                newState[category][field] = parsedValue;
                
                // คำนวณผลรวมใหม่
                newState.patientCensusTotal = calculatePatientCensusTotal(newState);
                
                return newState;
            });
        } 
        // สำหรับบุคลากร (personnelData)
        else if (category === 'personnelData') {
            setFormData(prevState => {
                const newState = { ...prevState };
                
                // ตรวจสอบและสร้างโครงสร้างข้อมูลหากไม่มี
                if (!newState[category]) newState[category] = {};
                newState[category][field] = parsedValue;
                
                return newState;
            });
        }
        // สำหรับหมายเหตุ (notes)
        else if (category === 'notes') {
            setFormData(prevState => {
                const newState = { ...prevState };
                
                // ตรวจสอบว่า notes เป็น object หรือไม่ ถ้าไม่ใช่ให้สร้าง object ใหม่
                if (!newState[category] || typeof newState[category] !== 'object') {
                    newState[category] = {};
                }
                
                newState[category][field] = parsedValue;
                return newState;
            });
        }
        // สำหรับข้อมูลทั่วไป
        else {
            setFormData(prevState => ({
                ...prevState,
                [field]: parsedValue
            }));
        }
    };

    if (isLoading) {
        return (
            <div className={`p-8 rounded-lg shadow-md ${formBgClass} animate-pulse min-h-[400px] flex flex-col items-center justify-center`}>
                <div className="w-12 h-12 border-t-2 border-b-2 border-[#0ab4ab] rounded-full animate-spin mb-4"></div>
                <p className={`text-center ${textClass}`}>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* แสดงแผนกด้วยสี pastel ที่โดดเด่น */}
            <div className={`p-3 mb-4 rounded-lg shadow-md ${isDark ? 'bg-indigo-900' : 'bg-blue-50'} border ${isDark ? 'border-indigo-800' : 'border-blue-200'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-center">
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'} mb-2 sm:mb-0`}>
                        แบบฟอร์มบันทึกข้อมูล
                    </h2>
                    <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-indigo-800 text-blue-200' : 'bg-blue-100 text-blue-800'} font-medium`}>
                        แผนก: {user?.department || 'ไม่ระบุแผนก'}
                    </div>
                </div>
            </div>

            {/* ขยายส่วนวันที่และกะให้ใช้พื้นที่เต็ม */}
            <div className={`p-5 rounded-lg shadow-md ${formBgClass} mb-6 border`}>
                <div className="grid grid-cols-1 gap-6">
                    {/* ใช้พื้นที่เต็มสำหรับ DateSelector */}
                    <div className="col-span-1">
                        <FormDateShiftSelector
                            selectedDate={selectedDate}
                            onDateSelect={handleLocalDateSelect}
                            datesWithData={datesWithData}
                            showCalendar={showCalendar}
                            setShowCalendar={setShowCalendar}
                            thaiDate={thaiDate}
                            selectedShift={selectedShift}
                            onShiftChange={handleShiftChange}
                            theme={theme}
                            hasUnsavedChanges={hasUnsavedChanges}
                            onSaveDraft={onSaveDraft}
                            selectedWard={selectedWard}
                            setApprovalStatus={setApprovalStatus}
                            setFormData={setFormData}
                        />
                    </div>
                </div>
            </div>

            <WardFormSections
                formData={formData}
                handleInputChange={handleFormChange}
                isReadOnly={isReadOnly}
                theme={theme}
            />

            {/* ปุ่มบันทึกและส่ง */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center w-full bg-white border-t border-gray-200 shadow-md px-4 py-2 space-x-2">
                {!isReadOnly && (
                    <>
                        <button
                            type="button"
                            className={`px-4 py-2 rounded mr-2 ${
                                isSubmitting && isDraftMode
                                    ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                            onClick={(e) => {
                                console.log('Save Draft button clicked');
                                e.preventDefault();
                                if (!selectedDate || !selectedShift || !selectedWard) {
                                    console.log('Validation failed: missing date, shift, or ward');
                                    AlertUtil.warning(
                                        'ข้อมูลไม่ครบถ้วน',
                                        'กรุณาเลือกวันที่ แผนก และกะการทำงานให้ครบถ้วน'
                                    );
                                    return;
                                }
                                console.log('Calling onSaveDraft...');
                                onSaveDraft();
                            }}
                            disabled={isSubmitting && isDraftMode}
                        >
                            {isSubmitting && isDraftMode ? 'กำลังบันทึก...' : 'Save Draft'}
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 rounded ${
                                isSubmitting && !isDraftMode
                                    ? 'bg-green-200 text-green-700 cursor-not-allowed'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                            disabled={isSubmitting && !isDraftMode}
                            onClick={(e) => {
                                console.log('Save Final button clicked');
                                e.preventDefault();
                                if (!selectedDate || !selectedShift || !selectedWard) {
                                    console.log('Validation failed: missing date, shift, or ward');
                                    AlertUtil.warning(
                                        'ข้อมูลไม่ครบถ้วน',
                                        'กรุณาเลือกวันที่ แผนก และกะการทำงานให้ครบถ้วน'
                                    );
                                    return;
                                }
                                console.log('Calling onSubmit...');
                                onSubmit();
                            }}
                        >
                            {isSubmitting && !isDraftMode ? 'กำลังบันทึก...' : 'Save Final'}
                        </button>
                    </>
                )}
            </div>
            
            {/* Alert Component */}
            {alertConfig.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 max-w-md w-full shadow-lg`}>
                        <h3 className="text-xl font-bold mb-4">{alertConfig.title}</h3>
                        <p className="mb-6">{alertConfig.message}</p>
                        <div className="flex justify-end space-x-4">
                            {alertConfig.cancelText && (
                                <button
                                    onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                                    className={`px-4 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
                                >
                                    {alertConfig.cancelText}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const { onConfirm } = alertConfig;
                                    setAlertConfig(prev => ({ ...prev, isOpen: false }));
                                    if (onConfirm) onConfirm();
                                }}
                                className={`px-4 py-2 ${buttonBgClass} text-white rounded-md`}
                            >
                                {alertConfig.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainFormContent; 