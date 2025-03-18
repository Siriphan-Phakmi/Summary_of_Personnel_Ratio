'use client';
import React, { useEffect } from 'react';
import { handleInputChange } from './EventHandlers';
import LoadingScreen from '../../ui/LoadingScreen';
import FormDateShiftSelector from '../../common/FormDateShiftSelector';
import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';
import { calculatePatientCensus } from './DataFetchers';

export const PatientCensusSection = ({ formData, setFormData, setHasUnsavedChanges, selectedShift, theme }) => {
    // ฟังก์ชันช่วยคำนวณค่าตามสูตร
    const calculatePatientMovement = (data) => {
        if (!data) return '';
        
        // ฟังก์ชันช่วยแปลงค่าที่อาจเป็นข้อความให้เป็นตัวเลข (ถ้าแปลงไม่ได้ ให้เป็น 0)
        const safeParseInt = (value) => {
            if (value === '' || value === null || value === undefined) return 0;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
        };
        
        // แปลงค่าก่อนคำนวณ
        const newAdmit = safeParseInt(data.newAdmit);
        const transferIn = safeParseInt(data.transferIn);
        const referIn = safeParseInt(data.referIn);
        const transferOut = safeParseInt(data.transferOut);
        const referOut = safeParseInt(data.referOut);
        const discharge = safeParseInt(data.discharge);
        const dead = safeParseInt(data.dead);
        
        return newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
    };
    
    // Handle input changes with recalculation
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // กรองให้เป็นตัวเลขเท่านั้น
        const numericValue = value.replace(/[^0-9]/g, '');
        
        // อัพเดทค่าในฟอร์ม
        setFormData(prev => ({
            ...prev,
            [name]: numericValue || '0'
        }));
        
        // สั่งคำนวณใหม่ทันที (เฉพาะฟิลด์ที่เกี่ยวข้องกับการคำนวณ)
        if ([
            'newAdmit', 'transferIn', 'referIn', 
            'transferOut', 'referOut', 'discharge', 'dead'
        ].includes(name)) {
            // ฟอร์มควรคำนวณอัตโนมัติผ่าน useEffect
        }
    };
    
    useEffect(() => {
        if (formData) {
            // ตรวจสอบก่อนว่ามีการใส่ข้อมูลบ้างหรือยัง
            const hasInputValues = formData.newAdmit || 
                                  formData.transferIn || 
                                  formData.referIn || 
                                  formData.transferOut || 
                                  formData.referOut || 
                                  formData.discharge || 
                                  formData.dead;
            
            // ถ้ายังไม่ได้ใส่ข้อมูลใดๆ เลย ให้เว้นว่าง ไม่ใส่ 0
            if (!hasInputValues) {
                if (formData.shift === 'เช้า' || formData.shift === '07:00-19:00') {
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: ''
                    }));
                } else {
                    setFormData(prev => ({
                        ...prev,
                        overallData: ''
                    }));
                }
                return;
            }
            
            // คำนวณต่อเมื่อมีข้อมูลอย่างน้อย 1 ช่อง
            const newAdmit = parseInt(formData.newAdmit || '0');
            const transferIn = parseInt(formData.transferIn || '0');
            const referIn = parseInt(formData.referIn || '0');
            const transferOut = parseInt(formData.transferOut || '0');
            const referOut = parseInt(formData.referOut || '0');
            const discharge = parseInt(formData.discharge || '0');
            const dead = parseInt(formData.dead || '0');
            
            // คำนวณค่าใหม่
            const calculatedValue = String(
                (newAdmit + transferIn + referIn) - (transferOut + referOut + discharge + dead)
            );
            
            // อัพเดทค่าตามกะที่เลือก
            if (formData.shift === 'เช้า' || formData.shift === '07:00-19:00') {
                setFormData(prev => ({
                    ...prev,
                    patientCensus: calculatedValue
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    overallData: calculatedValue
                }));
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
        formData?.shift
    ]);
    
    return (
        <div className={`mb-6 p-4 rounded-lg shadow-md ${
            theme === 'dark' 
            ? 'bg-gray-700 text-white' 
            : 'bg-primary-pastel'
        }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-primary'
            }`}>Number of patients and movement</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Patient Census <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="patientCensus"
                        value={formData?.patientCensus || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-gray-100 border-primary-light text-gray-900'
                        }`}
                        readOnly={true} // Make read-only for both shifts
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                    {selectedShift === 'ดึก' && 
                        <p className={`text-xs mt-1 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>*ค่านี้จะถูกคำนวณจากกะเช้าและไม่สามารถแก้ไขได้</p>
                    }
                    {selectedShift === 'เช้า' && 
                        <p className={`text-xs mt-1 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>*คำนวณอัตโนมัติจาก Overall Data ของกะดึกวันก่อนหน้า ไม่สามารถแก้ไขได้</p>
                    }
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Overall Data <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="overallData"
                        value={formData?.overallData || ''}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-gray-100 border-primary-light text-gray-900'
                        }`}
                        readOnly={true} // ไม่ให้แก้ไขได้เลย เพราะคำนวณอัตโนมัติ
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                    <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                        *คำนวณตามสูตร: Patient Census + (New Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead)
                    </p>
                </div>
                
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        New Admit
                    </label>
                    <input
                        type="text"
                        name="newAdmit"
                        value={formData?.newAdmit || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Transfer In
                    </label>
                    <input
                        type="text"
                        name="transferIn"
                        value={formData?.transferIn || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Refer In
                    </label>
                    <input
                        type="text"
                        name="referIn"
                        value={formData?.referIn || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Transfer Out
                    </label>
                    <input
                        type="text"
                        name="transferOut"
                        value={formData?.transferOut || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Refer Out
                    </label>
                    <input
                        type="text"
                        name="referOut"
                        value={formData?.referOut || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Discharge
                    </label>
                    <input
                        type="text"
                        name="discharge"
                        value={formData?.discharge || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Dead
                    </label>
                    <input
                        type="text"
                        name="dead"
                        value={formData?.dead || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Available
                    </label>
                    <input
                        type="text"
                        name="availableBeds"
                        value={formData?.availableBeds || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Unavailable
                    </label>
                    <input
                        type="text"
                        name="unavailable"
                        value={formData?.unavailable || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Planned Discharge
                    </label>
                    <input
                        type="text"
                        name="plannedDischarge"
                        value={formData?.plannedDischarge || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
            </div>
        </div>
    );
};

export const StaffSection = ({ formData, setFormData, setHasUnsavedChanges, theme }) => {
    // Add numeric input handler
    const handleNumericInput = (e) => {
        // Ensure the input is numeric only
        const numericValue = e.target.value.replace(/[^0-9]/g, '');
        const name = e.target.name;
        
        // Update form data directly
        setFormData(prev => ({
            ...prev,
            [name]: numericValue
        }));
        
        // Set has unsaved changes
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
    };
    
    return (
        <div className={`mb-6 p-4 rounded-lg shadow-md ${
            theme === 'dark' 
            ? 'bg-gray-700 text-white' 
            : 'bg-white'
        }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-primary'
            }`}>Number of Personnel</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        Nurse Manager
                    </label>
                    <input
                        type="text"
                        name="nurseManager"
                        value={formData?.nurseManager || ''}
                        onChange={handleNumericInput}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        RN
                    </label>
                    <input
                        type="text"
                        name="RN"
                        value={formData?.RN || ''}
                        onChange={handleNumericInput}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        PN
                    </label>
                    <input
                        type="text"
                        name="PN"
                        value={formData?.PN || ''}
                        onChange={handleNumericInput}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        WC
                    </label>
                    <input
                        type="text"
                        name="WC"
                        value={formData?.WC || ''}
                        onChange={handleNumericInput}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        NA
                    </label>
                    <input
                        type="text"
                        name="NA"
                        value={formData?.NA || ''}
                        onChange={handleNumericInput}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
            </div>
        </div>
    );
};

export const NotesSection = ({ formData, setFormData, setHasUnsavedChanges, theme }) => {
    return (
        <div className={`mb-6 p-4 rounded-lg shadow-md ${
            theme === 'dark' 
            ? 'bg-gray-700 text-white' 
            : 'bg-white'
        }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-primary'
            }`}>Comment</h2>
            <div>
                <textarea
                    name="comment"
                    value={formData?.comment || ''}
                    onChange={(e) => {
                        // Direct comment update with no validation to ensure it's editable
                        setFormData(prev => ({...prev, comment: e.target.value}));
                        setHasUnsavedChanges(true);
                    }}
                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                        theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    rows="3"
                    placeholder="Add comment..."
                ></textarea>
            </div>
        </div>
    );
};

// เพิ่ม MainFormContent component
export const MainFormContent = ({ 
    isLoading,
    selectedDate,
    selectedShift,
    selectedWard,
    formData,
    setFormData,
    handleLocalDateSelect,
    handleShiftChange,
    thaiDate,
    setThaiDate,
    showCalendar,
    setShowCalendar,
    datesWithData,
    theme,
    approvalStatus,
    setHasUnsavedChanges,
    onSaveDraft,
    onSubmit,
    isSubmitting,
    isDraftMode
}) => {
    // ฟังก์ชันสำหรับการแสดงผลตามเงื่อนไข
    const renderContent = () => {
        if (isLoading) {
            return <LoadingScreen />;
        }

        // ถ้ายังไม่เลือกวันที่หรือกะ ให้แสดงเฉพาะส่วนเลือกวันที่และกะเท่านั้น
        if (!selectedDate || !selectedShift) {
            return (
                <div className={`flex flex-col items-center justify-center p-6 ${
                    theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-100'
                } rounded-lg shadow-md border`}>
                    <div className="text-center mb-8">
                        <h2 className={`text-2xl font-bold mb-2 ${
                            theme === 'dark' ? 'text-teal-300' : 'text-teal-700'
                        }`}>กรุณาเลือกข้อมูลเริ่มต้น</h2>
                        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            โปรดเลือกวันที่และกะก่อนเริ่มกรอกข้อมูล
                        </p>
                    </div>
                    
                    <div className={`w-full max-w-md p-6 rounded-xl shadow-lg border ${
                        theme === 'dark' 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-white border-teal-200'
                    }`}>
                        <FormDateShiftSelector
                            selectedDate={selectedDate}
                            onDateSelect={handleLocalDateSelect}
                            thaiDate={thaiDate}
                            setThaiDate={setThaiDate}
                            selectedShift={selectedShift === 'เช้า' ? '07:00-19:00' : '19:00-07:00'}
                            onShiftChange={(value) => {
                                const newShift = value === '07:00-19:00' ? 'เช้า' : 'ดึก';
                                if (typeof handleShiftChange === 'function') {
                                    handleShiftChange(newShift);
                                } else {
                                    console.warn('handleShiftChange is not a function in MainFormContent');
                                }
                            }}
                            showCalendar={showCalendar}
                            setShowCalendar={setShowCalendar}
                            datesWithData={datesWithData}
                            theme={theme}
                        />
                    </div>
                </div>
            );
        }

        return (
            <form onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }} className="space-y-6">
                {/* แสดงสถานะ Draft Mode ถ้ากำลังอยู่ใน Draft */}
                {isDraftMode && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <span className="font-medium">โหมดฉบับร่าง:</span> คุณกำลังแก้ไขข้อมูลในโหมดฉบับร่าง กรุณาบันทึกข้อมูลฉบับสมบูรณ์เมื่อกรอกข้อมูลครบถ้วน
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`p-6 rounded-lg shadow-md border ${
                    isDraftMode 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-200'
                }`}>
                    <PatientCensusSection 
                        formData={formData} 
                        setFormData={setFormData} 
                        setHasUnsavedChanges={setHasUnsavedChanges}
                        selectedShift={selectedShift}
                        theme={theme}
                    />
                    
                    <StaffSection 
                        formData={formData} 
                        setFormData={setFormData} 
                        setHasUnsavedChanges={setHasUnsavedChanges}
                        theme={theme}
                    />
                    
                    <NotesSection 
                        formData={formData} 
                        setFormData={setFormData} 
                        setHasUnsavedChanges={setHasUnsavedChanges}
                        theme={theme}
                    />
                    
                    <RecordingOfficerSection 
                        formData={formData} 
                        setFormData={setFormData} 
                        setHasUnsavedChanges={setHasUnsavedChanges}
                        theme={theme}
                    />
                    
                    <ActionButtons onSaveDraft={onSaveDraft} isSubmitting={isSubmitting} />
                </div>
            </form>
        );
    };

    return (
        <div className="container mx-auto max-w-4xl p-4">
            <div className="mb-8">
                <FormDateShiftSelector
                    selectedDate={selectedDate}
                    onDateSelect={handleLocalDateSelect}
                    thaiDate={thaiDate}
                    setThaiDate={setThaiDate}
                    selectedShift={selectedShift === 'เช้า' ? '07:00-19:00' : '19:00-07:00'}
                    onShiftChange={(value) => {
                        const newShift = value === '07:00-19:00' ? 'เช้า' : 'ดึก';
                        if (typeof handleShiftChange === 'function') {
                            handleShiftChange(newShift);
                        } else {
                            console.warn('handleShiftChange is not a function in MainFormContent');
                        }
                    }}
                    showCalendar={showCalendar}
                    setShowCalendar={setShowCalendar}
                    datesWithData={datesWithData}
                    theme={theme}
                />
                
                {approvalStatus && (
                    <div className="mb-4">
                        <ApprovalStatusIndicator status={approvalStatus} theme={theme} />
                    </div>
                )}
            </div>
            
            <div className="space-y-8">
                {renderContent()}
            </div>
        </div>
    );
};

// เพิ่ม RecordingOfficerSection component
export const RecordingOfficerSection = ({ formData, setFormData, setHasUnsavedChanges, theme }) => {
    return (
        <div className={`mb-6 p-4 rounded-lg shadow-md ${
            theme === 'dark' 
            ? 'bg-gray-700 text-white' 
            : 'bg-white'
        }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
                Recording Officer <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        first name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={(e) => {
                            // Direct update to ensure field is editable
                            setFormData(prev => ({...prev, firstName: e.target.value}));
                            setHasUnsavedChanges(true);
                        }}
                        className={`w-full p-2 border rounded-md ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                        last name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={(e) => {
                            // Direct update to ensure field is editable
                            setFormData(prev => ({...prev, lastName: e.target.value}));
                            setHasUnsavedChanges(true);
                        }}
                        className={`w-full p-2 border rounded-md ${
                            theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                    />
                </div>
            </div>
        </div>
    );
};

// เพิ่ม ActionButtons component
export const ActionButtons = ({ onSaveDraft, isSubmitting }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4 mb-8">
            <button
                type="button"
                onClick={onSaveDraft}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'กำลังบันทึก...' : 'Save Draft'}
            </button>
            
            <button
                type="submit"
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'กำลังบันทึก...' : 'Save Final'}
            </button>
        </div>
    );
}; 